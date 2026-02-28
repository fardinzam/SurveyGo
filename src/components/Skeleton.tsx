import React from 'react';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
    );
}

/** Card-shaped skeleton for dashboard stats */
export function StatCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
        </div>
    );
}

/** Table row skeleton for surveys list */
export function SurveyRowSkeleton() {
    return (
        <tr>
            <td className="px-4 py-4"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-24 mt-1" /></td>
            <td className="px-4 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
            <td className="px-4 py-4"><Skeleton className="h-5 w-8" /></td>
            <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
            <td className="px-4 py-4"><Skeleton className="h-5 w-20" /></td>
            <td className="px-3 py-4"><Skeleton className="h-5 w-5 rounded" /></td>
        </tr>
    );
}

/** Full page loading skeleton */
export function PageSkeleton() {
    return (
        <div className="p-8 space-y-6 animate-pulse">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
            <div className="grid grid-cols-3 gap-6 mt-6">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        </div>
    );
}
