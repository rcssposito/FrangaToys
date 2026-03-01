import React, { ReactNode } from 'react';

interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-t-zinc-800 border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-zinc-800 border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-l-zinc-800 border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-r-zinc-800 border-y-transparent border-l-transparent',
    };

    return (
        <div className="relative group/tooltip inline-block">
            {children}
            <div
                className={`absolute z-50 whitespace-nowrap px-3 py-1.5 text-xs font-medium text-white bg-zinc-800/95 backdrop-blur-sm rounded-md border border-zinc-700 shadow-xl pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 ease-in-out ${positionClasses[position]}`}
            >
                {content}
                <div
                    className={`absolute border-[5px] ${arrowClasses[position]}`}
                />
            </div>
        </div>
    );
}
