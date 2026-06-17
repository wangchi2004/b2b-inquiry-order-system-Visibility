"use client";

import { useState } from "react";
import type { HomeGalleryImage } from "@/lib/products";

type HomePhotoWallProps = {
  images: HomeGalleryImage[];
  labels?: {
    title?: string;
    description?: string;
    empty?: string;
    close?: string;
  };
};

export function HomePhotoWall({ images, labels }: HomePhotoWallProps) {
  const [activeImage, setActiveImage] = useState<HomeGalleryImage | null>(null);

  if (images.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-slate-950">
          {labels?.title ?? "Photo Wall"}
        </h2>
        <p className="text-sm text-slate-600">
          {labels?.description ?? "Click any photo to view it larger."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setActiveImage(image)}
            className="group aspect-square overflow-hidden rounded border border-slate-200 bg-slate-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            aria-label={`Open ${image.title}`}
          >
            <img
              src={image.url}
              alt={image.title}
              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activeImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded bg-white p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute right-4 top-4 z-10 rounded bg-white/95 px-3 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-slate-100"
            >
              {labels?.close ?? "Close"}
            </button>
            <img
              src={activeImage.url}
              alt={activeImage.title}
              className="max-h-[82vh] w-full rounded object-contain"
            />
            <p className="mt-3 text-sm font-medium text-slate-700">
              {activeImage.title}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
