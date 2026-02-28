/**
 * Hybrid LLM Router - Reference Implementation
 * 
 * This file demonstrates the hybrid AI routing strategy for SurveyGo.
 * In production, these would be split into separate module files.
 * 
 * Files structure:
 * - types.ts - Shared types
 * - config.ts - Model configuration  
 * - llm-router.ts - Routing logic
 * - openai-analyzer.ts - OpenAI implementation
 * - claude-analyzer.ts - Claude implementation
 * - analyzer-service.ts - Main orchestration service
 * - handler.ts - AWS Lambda handler
 */

// === IMPORTS ===
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { SQSHandler } from 'aws-lambda';

// === TYPES ===
export interface SurveyResponse {
  id: string;
  survey_id: string;
  answers: Record<string, any>;
  respondent_id?: string;
  respondent_metadata?: {
    customer_tier?: 'free' | 'pro' | 'vip';
    lifetime_value?: number;
  };
}

export interface AnalysisResult {
  sentiment_score: number; // -1.0 to 1.0
  sentiment_label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  emotions: string[]; // ['frustration', 'satisfaction', etc.]
  themes: string[]; // ['shipping', 'pricing', etc.]
  urgency_score: number; // 0-10
  is_urgent: boolean;
  keywords: string[];
}

export interface Question {
  id: string;
  type: string;
  text: string;
}

// config.ts - Model configuration
export const MODEL_CONFIG = {
  openai: {
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0.3,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
  },
  claude: {
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 1000,
    temperature: 0.3,
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
  },
} as const;

// Routing thresholds
export const ROUTING_CONFIG = {
  vipCustomerTiers: ['vip', 'enterprise'],
  complexResponseThreshold: 1000, // characters
  highValueCustomerLTV: 5000, // dollars
  urgentKeywords: [
    'urgent', 'immediately', 'asap', 'emergency',
    'cancel', 'refund', 'lawsuit', 'attorney',
    'terrible', 'worst', 'horrible', 'unacceptable'
  ],
};

// llm-router.ts - Main routing logic
export class LLMRouter {
  /**
   * Determines which LLM to use based on response characteristics
   */
  static selectModel(
    response: SurveyResponse,
    openEndedText: string
  ): 'openai' | 'claude' {
    // Priority 1: VIP customers always get Claude
    if (this.isVIPCustomer(response)) {
      console.log(`[Router] Using Claude for VIP customer: ${response.respondent_id}`);
      return 'claude';
    }

    // Priority 2: High-value customers
    if (this.isHighValueCustomer(response)) {
      console.log(`[Router] Using Claude for high-value customer`);
      return 'claude';
    }

    // Priority 3: Complex or lengthy responses
    if (this.isComplexResponse(openEndedText)) {
      console.log(`[Router] Using Claude for complex response (${openEndedText.length} chars)`);
      return 'claude';
    }

    // Priority 4: Responses with urgent keywords
    if (this.containsUrgentKeywords(openEndedText)) {
      console.log(`[Router] Using Claude for potentially urgent response`);
      return 'claude';
    }

    // Default: Use GPT-4o mini (cost-effective)
    console.log(`[Router] Using GPT-4o mini for standard response`);
    return 'openai';
  }

  private static isVIPCustomer(response: SurveyResponse): boolean {
    const tier = response.respondent_metadata?.customer_tier;
    return tier ? ROUTING_CONFIG.vipCustomerTiers.includes(tier) : false;
  }

  private static isHighValueCustomer(response: SurveyResponse): boolean {
    const ltv = response.respondent_metadata?.lifetime_value ?? 0;
    return ltv >= ROUTING_CONFIG.highValueCustomerLTV;
  }

  private static isComplexResponse(text: string): boolean {
    return text.length > ROUTING_CONFIG.complexResponseThreshold;
  }

  private static containsUrgentKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    return ROUTING_CONFIG.urgentKeywords.some(keyword =>
      lowerText.includes(keyword)
    );
  }
}

// === OPENAI ANALYZER ===

export class OpenAIAnalyzer {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyzeSingle(
    openEndedText: string,
    surveyContext?: string
  ): Promise<AnalysisResult> {
    const prompt = this.buildPrompt(openEndedText, surveyContext);

    const response = await this.client.chat.completions.create({
      model: MODEL_CONFIG.openai.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing customer feedback. Always respond with valid JSON only, no markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: MODEL_CONFIG.openai.temperature,
      max_tokens: MODEL_CONFIG.openai.maxTokens,
      response_format: { type: 'json_object' }, // Enforces JSON output
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from OpenAI');

    return JSON.parse(content) as AnalysisResult;
  }

  /**
   * Analyze multiple responses in a single API call (cost optimization)
   */
  async analyzeBatch(
    responses: Array<{ id: string; text: string }>,
    surveyContext?: string
  ): Promise<Record<string, AnalysisResult>> {
    const batchPrompt = `Analyze these ${responses.length} customer feedback responses.

Survey Context: ${surveyContext || 'General customer satisfaction survey'}

Responses:
${responses.map((r, i) => `[Response ${i + 1} - ID: ${r.id}]
${r.text}`).join('\n\n---\n\n')}

Return a JSON object with response IDs as keys and analysis results as values.
Each analysis should include: sentiment_score, sentiment_label, emotions, themes, urgency_score, is_urgent, keywords.`;

    const response = await this.client.chat.completions.create({
      model: MODEL_CONFIG.openai.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing customer feedback. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: batchPrompt
        }
      ],
      temperature: MODEL_CONFIG.openai.temperature,
      max_tokens: MODEL_CONFIG.openai.maxTokens * responses.length,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from OpenAI');

    return JSON.parse(content);
  }

  private buildPrompt(text: string, context?: string): string {
    return `Analyze this customer feedback and provide a detailed analysis.

${context ? `Survey Context: ${context}\n` : ''}
Customer Feedback: "${text}"

Provide your analysis in the following JSON format:
{
  "sentiment_score": <number between -1.0 and 1.0>,
  "sentiment_label": "<very_negative|negative|neutral|positive|very_positive>",
  "emotions": [<array of detected emotions like "frustration", "joy", "anger", "satisfaction">],
  "themes": [<array of main themes/topics mentioned like "shipping", "pricing", "quality">],
  "urgency_score": <number 0-10, how urgent is this feedback>,
  "is_urgent": <boolean, true if requires immediate attention>,
  "keywords": [<array of important keywords from the feedback>]
}

Guidelines:
- sentiment_score: -1.0 = very negative, 0 = neutral, 1.0 = very positive
- urgency_score: Consider complaint severity, customer emotion, mention of churn/cancellation
- is_urgent: Flag as true if mentions legal action, immediate cancellation, safety issues, or extreme dissatisfaction
- themes: Extract 2-5 main topics (e.g., "product quality", "customer service", "pricing")
- emotions: Identify 1-3 primary emotions expressed`;
  }
}

// === CLAUDE ANALYZER ===

export class ClaudeAnalyzer {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeSingle(
    openEndedText: string,
    surveyContext?: string
  ): Promise<AnalysisResult> {
    const prompt = this.buildPrompt(openEndedText, surveyContext);

    const response = await this.client.messages.create({
      model: MODEL_CONFIG.claude.model,
      max_tokens: MODEL_CONFIG.claude.maxTokens,
      temperature: MODEL_CONFIG.claude.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    // Claude might wrap JSON in markdown, so clean it
    const cleanedContent = content.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedContent) as AnalysisResult;
  }

  private buildPrompt(text: string, context?: string): string {
    return `Analyze this customer feedback with deep attention to nuance, emotion, and urgency.

${context ? `Survey Context: ${context}\n` : ''}
Customer Feedback: "${text}"

Provide your analysis in JSON format with these fields:
- sentiment_score: number between -1.0 and 1.0
- sentiment_label: very_negative, negative, neutral, positive, or very_positive
- emotions: array of detected emotions (e.g., frustration, joy, anger, disappointment)
- themes: array of main themes/topics (2-5 items)
- urgency_score: number 0-10 indicating how urgent this feedback is
- is_urgent: boolean, true if requires immediate attention
- keywords: array of important keywords

Consider:
- Subtle emotional cues and tone
- Implicit complaints or praise
- Customer effort and pain points
- Churn risk indicators
- Opportunities for improvement

Respond with JSON only, no additional text.`;
  }
}

// === ANALYZER SERVICE ===

export class AnalyzerService {
  private openaiAnalyzer: OpenAIAnalyzer;
  private claudeAnalyzer: ClaudeAnalyzer;
  private supabase: ReturnType<typeof createClient>;

  constructor(
    openaiKey: string,
    claudeKey: string,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.openaiAnalyzer = new OpenAIAnalyzer(openaiKey);
    this.claudeAnalyzer = new ClaudeAnalyzer(claudeKey);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Main entry point: Analyze a survey response
   */
  async analyzeResponse(responseId: string): Promise<void> {
    try {
      // 1. Fetch response from database
      const { data: response, error } = await this.supabase
        .from('responses')
        .select('*, survey:surveys(*)')
        .eq('id', responseId)
        .single();

      if (error || !response) {
        throw new Error(`Response not found: ${responseId}`);
      }

      // 2. Extract open-ended text from answers
      const openEndedText = this.extractOpenEndedText(
        response.answers,
        response.survey.questions
      );

      if (!openEndedText || openEndedText.trim().length === 0) {
        console.log(`[Analyzer] No open-ended text found for response ${responseId}`);
        return;
      }

      // 3. Route to appropriate model
      const model = LLMRouter.selectModel(response, openEndedText);

      // 4. Perform analysis
      const surveyContext = `${response.survey.title}: ${response.survey.description || ''}`;
      let analysisResult: AnalysisResult;

      if (model === 'claude') {
        analysisResult = await this.claudeAnalyzer.analyzeSingle(
          openEndedText,
          surveyContext
        );
      } else {
        analysisResult = await this.openaiAnalyzer.analyzeSingle(
          openEndedText,
          surveyContext
        );
      }

      // 5. Update database with analysis results
      await this.saveAnalysisResults(responseId, analysisResult);

      // 6. Handle urgent responses
      if (analysisResult.is_urgent) {
        await this.handleUrgentResponse(responseId, response, analysisResult);
      }

      console.log(`[Analyzer] Successfully analyzed response ${responseId} using ${model}`);
    } catch (error) {
      console.error(`[Analyzer] Error analyzing response ${responseId}:`, error);
      throw error;
    }
  }

  /**
   * Batch analyze multiple responses (cost optimization)
   * Uses GPT-4o mini for batch processing
   */
  async analyzeBatch(responseIds: string[]): Promise<void> {
    const { data: responses } = await this.supabase
      .from('responses')
      .select('*, survey:surveys(*)')
      .in('id', responseIds);

    if (!responses || responses.length === 0) return;

    // Prepare batch data
    const batchData = responses
      .map(r => ({
        id: r.id,
        text: this.extractOpenEndedText(r.answers, r.survey.questions),
      }))
      .filter(r => r.text.length > 0);

    if (batchData.length === 0) return;

    // Analyze in batch
    const surveyContext = responses[0].survey.title;
    const results = await this.openaiAnalyzer.analyzeBatch(batchData, surveyContext);

    // Save all results
    for (const [responseId, analysisResult] of Object.entries(results)) {
      await this.saveAnalysisResults(responseId, analysisResult);
    }

    console.log(`[Analyzer] Batch analyzed ${batchData.length} responses`);
  }

  private extractOpenEndedText(
    answers: Record<string, any>,
    questions: Question[]
  ): string {
    const openEndedQuestions = questions.filter(q =>
      q.type === 'long_text' || q.type === 'short_text'
    );

    return openEndedQuestions
      .map(q => answers[q.id])
      .filter(Boolean)
      .join(' | ');
  }

  private async saveAnalysisResults(
    responseId: string,
    result: AnalysisResult
  ): Promise<void> {
    await this.supabase
      .from('responses')
      .update({
        sentiment_score: result.sentiment_score,
        sentiment_label: result.sentiment_label,
        emotions: result.emotions,
        urgency_score: result.urgency_score,
        is_urgent: result.is_urgent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId);

    // Save themes (if any)
    if (result.themes.length > 0) {
      await this.saveThemes(responseId, result.themes);
    }
  }

  private async saveThemes(responseId: string, themes: string[]): Promise<void> {
    // This would involve theme extraction and linking logic
    // Simplified for this example
    console.log(`[Analyzer] Saving themes for ${responseId}:`, themes);
  }

  private async handleUrgentResponse(
    responseId: string,
    response: any,
    analysis: AnalysisResult
  ): Promise<void> {
    console.log(`[Analyzer] 🚨 URGENT RESPONSE DETECTED: ${responseId}`);

    // Send notifications (implement based on your needs)
    // - Email to support team
    // - Slack notification
    // - Create high-priority ticket

    // Example: Log to console (replace with actual notification logic)
    console.log({
      response_id: responseId,
      customer: response.respondent_email,
      urgency_score: analysis.urgency_score,
      sentiment: analysis.sentiment_label,
      themes: analysis.themes,
    });
  }
}

// === AWS LAMBDA HANDLER ===

const analyzer = new AnalyzerService(
  process.env.OPENAI_API_KEY!,
  process.env.CLAUDE_API_KEY!,
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { response_id } = JSON.parse(record.body);

    try {
      await analyzer.analyzeResponse(response_id);
    } catch (error) {
      console.error(`Failed to analyze response ${response_id}:`, error);
      // SQS will retry failed messages
      throw error;
    }
  }
};

// Example usage in your application
/*
// Initialize the service
const analyzer = new AnalyzerService(
  process.env.OPENAI_API_KEY,
  process.env.CLAUDE_API_KEY,
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Analyze single response (after submission)
await analyzer.analyzeResponse('response-uuid-123');

// Batch analyze (run nightly for cost savings)
await analyzer.analyzeBatch([
  'response-uuid-1',
  'response-uuid-2',
  'response-uuid-3',
  // ... up to 10 responses
]);
*/