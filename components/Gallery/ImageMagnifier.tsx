'use client';

import { useState } from 'react';
import Image from 'next/image';
import imageKitLoader from '@/lib/image-loader';

interface ImageMagnifierProps {
    src: string;
    alt: string;
    magnifierHeight?: number;
    magnifierWidth?: number;
    zoomLevel?: number;
    onClick?: () => void;
}

export const ImageMagnifier = ({
    src,
    alt,
    magnifierHeight = 250,
    magnifierWidth = 250,
    zoomLevel = 2.5,
    onClick
}: ImageMagnifierProps) => {
    const [[x, y], setXY] = useState([0, 0]);
    const [[imgWidth, imgHeight], setSize] = useState([0, 0]);
    const [showMagnifier, setShowMagnifier] = useState(false);

    // ImageKit specific URL resolution for background image
    const resolvedSrc = src.startsWith('http') ? src : `https://ik.imagekit.io/lojinha3d/${src}`;

    return (
        <div
            className="relative w-full h-full cursor-crosshair group lg:block hidden"
            onMouseEnter={(e) => {
                const elem = e.currentTarget;
                const { width, height } = elem.getBoundingClientRect();
                setSize([width, height]);
                setShowMagnifier(true);
            }}
            onMouseMove={(e) => {
                const elem = e.currentTarget;
                const { top, left } = elem.getBoundingClientRect();
                const mouseX = e.pageX - left - window.scrollX;
                const mouseY = e.pageY - top - window.scrollY;
                setXY([mouseX, mouseY]);
            }}
            onMouseLeave={() => {
                setShowMagnifier(false);
            }}
            onClick={onClick}
        >
            <Image
                loader={imageKitLoader}
                src={src}
                alt={alt}
                fill
                className="object-contain p-4"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
            />

            {showMagnifier && (
                <div
                    className="pointer-events-none absolute z-50 overflow-hidden rounded-full border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-sm"
                    style={{
                        height: `${magnifierHeight}px`,
                        width: `${magnifierWidth}px`,
                        top: `${y - magnifierHeight / 2}px`,
                        left: `${x - magnifierWidth / 2}px`,
                        backgroundImage: `url('${resolvedSrc}')`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: `${imgWidth * zoomLevel}px ${imgHeight * zoomLevel}px`,
                        backgroundPositionX: `${-x * zoomLevel + magnifierWidth / 2}px`,
                        backgroundPositionY: `${-y * zoomLevel + magnifierHeight / 2}px`,
                    }}
                />
            )}
            
            {/* Corner Decorative Hint */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Detail View Active</span>
            </div>
        </div>
    );
};
