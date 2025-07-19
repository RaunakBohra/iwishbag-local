import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
const Hero = () => {
  return (
    <section className="bg-teal-50 ">
      {' '}
      <div className="container py-24 sm:py-32 md:py-40 text-center">
        {' '}
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-gray-900 ">
          {' '}
          Shop the World, <br /> Delivered to Your Doorstep.{' '}
        </h1>{' '}
        <p className="max-w-2xl mx-auto mt-6 text-lg text-gray-600 ">
          {' '}
          From US boutiques to Japanese gadgets, get anything you desire from across the globe. We
          handle the purchase, shipping, and customs for you.{' '}
        </p>{' '}
        <div className="mt-8 flex justify-center gap-4">
          {' '}
          <Button size="lg" asChild>
            {' '}
            <Link to="/quote">Get Your Free Quote</Link>{' '}
          </Button>{' '}
          <Button size="lg" variant="outline" asChild>
            {' '}
            <a href="#cost-estimator">Estimate Cost</a>{' '}
          </Button>{' '}
        </div>{' '}
      </div>{' '}
    </section>
  );
};
export default Hero;
