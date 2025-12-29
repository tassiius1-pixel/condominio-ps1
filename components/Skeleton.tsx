import React from 'react';

interface SkeletonProps {
    className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
    return (
        <div
            className={`animate-pulse bg-gray-200 ${className}`}
            style={{
                animationDuration: '1.5s'
            }}
        />
    );
};

export default Skeleton;
