import { Button } from "@/components/ui/button";

export default function ButtonPreview() {
  return (
    <div className="space-y-8 p-8 bg-white/60 rounded-xl max-w-xl mx-auto mt-10 shadow-lg backdrop-blur">
      <h2 className="text-2xl font-bold mb-4">Button Variants (Tailwind + Custom)</h2>
      <div className="flex flex-col gap-4">
        <Button>Primary (Gradient)</Button>
        <button className="btn-secondary btn-grow">Secondary (Gradient)</button>
        <button className="btn-outline btn-grow">Outline (Gradient Border)</button>
        <button className="btn-glass btn-grow">Glass Button</button>
        <button className="btn-destructive btn-grow">Destructive (Red Gradient)</button>
        <button className="btn-link btn-grow">Link (Darker Blue)</button>
      </div>
      <hr className="my-6" />
      <h2 className="text-xl font-semibold mb-2">Scroll Reveal Example</h2>
      <div className="scroll-reveal bg-white/80 rounded-lg p-6 shadow text-center">
        <span className="text-lg font-medium">This section animates in on scroll!</span>
      </div>
      <hr className="my-6" />
      <h2 className="text-xl font-semibold mb-2">Logo Animation Example</h2>
      <div className="flex items-center justify-center gap-6">
        <img src="/favicon.ico" alt="Logo" className="h-16 w-16 logo-bounce logo-rotate cursor-pointer" />
        <span className="font-bold text-2xl text-[#052a2e] logo-bounce logo-rotate cursor-pointer">WishBag</span>
      </div>
    </div>
  );
} 