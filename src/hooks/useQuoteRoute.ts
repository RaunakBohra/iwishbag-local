import { useNavigate } from 'react-router-dom';

export const useQuoteRoute = () => {
  const navigate = useNavigate();

  const navigateToQuote = (quoteId: string) => {
    navigate(`/admin/quotes/${quoteId}`);
  };

  const navigateToNewQuote = () => {
    navigate('/quote');
  };

  const navigateToQuotesList = () => {
    navigate('/admin/quotes');
  };

  return {
    navigateToQuote,
    navigateToNewQuote,
    navigateToQuotesList,
  };
};