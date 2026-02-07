"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  images: { id: string; image_url: string; display_order: number }[];
  petName: string;
};

export default function AdoptionGallery({ images, petName }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-background-secondary text-8xl text-foreground-subtle">
        🐾
      </div>
    );
  }

  const activeImage = images[activeIndex]?.image_url;

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="relative overflow-hidden rounded-2xl bg-background-secondary">
        <div className="aspect-square">
          <img
            src={activeImage}
            alt={`${petName} - Photo ${activeIndex + 1}`}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-md transition-colors duration-300 hover:bg-card hover:shadow-lg"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <button
              onClick={() => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/90 p-2 shadow-md transition-colors duration-300 hover:bg-card hover:shadow-lg"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          </>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2">
          {images.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(index)}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-colors duration-300 ${
                index === activeIndex
                  ? "border-navy-soft ring-2 ring-navy-soft/20"
                  : "border-transparent hover:border-border"
              }`}
            >
              <img
                src={img.image_url}
                alt={`${petName} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
