import { useEffect } from 'react';

/** Sets the document title. Resets to default on unmount. */
export function usePageTitle(title: string) {
    useEffect(() => {
        const prev = document.title;
        document.title = title ? `${title} — SurveyGo` : 'SurveyGo';
        return () => { document.title = prev; };
    }, [title]);
}
