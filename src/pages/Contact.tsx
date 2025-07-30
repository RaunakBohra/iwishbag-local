import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { H2, Body } from '@/components/ui/typography';
import { Section, Container } from '@/components/ui/spacing';
import {
  Clock,
  ArrowLeft,
  HelpCircle,
  Ticket,
  MessageCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ContactTicketForm } from '@/components/support/ContactTicketForm';
import { businessHoursService } from '@/config/businessHours';
import { Card, CardContent } from '@/components/ui/card';

const Contact = () => {
  const navigate = useNavigate();
  const [ticketCreated, setTicketCreated] = useState(false);

  const isCurrentlyBusinessHours = businessHoursService.isCurrentlyBusinessHours();
  const businessHoursMessage = businessHoursService.getAutoResponseMessage();

  const handleTicketSuccess = () => {
    setTicketCreated(true);
  };

  const helpLinks = [
    { label: 'Browse FAQs', href: '/help', icon: HelpCircle },
    { label: 'Track Order', href: '/track', icon: Ticket },
    { label: 'My Tickets', href: '/support/my-tickets', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Section className="py-8">
        <Container>
          <div className="max-w-4xl mx-auto">
            {/* Header with Back Button */}
            <div className="mb-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/help')}
                className="text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Help Center
              </Button>
              
              <div className="text-center">
                <H2 className="mb-4 text-gray-900 text-3xl font-bold">Contact Support</H2>
                <Body className="text-gray-600 max-w-2xl mx-auto">
                  Create a support ticket and our team will assist you within 24-48 hours
                </Body>
              </div>
            </div>

            {/* Business Hours Status */}
            <div
              className={`mx-auto max-w-md mb-8 p-4 rounded-lg border text-center ${
                isCurrentlyBusinessHours
                  ? 'bg-green-50 border-green-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock
                  className={`w-4 h-4 ${isCurrentlyBusinessHours ? 'text-green-600' : 'text-orange-600'}`}
                />
                <span
                  className={`font-medium text-sm ${isCurrentlyBusinessHours ? 'text-green-900' : 'text-orange-900'}`}
                >
                  {isCurrentlyBusinessHours
                    ? '🟢 Support team is online'
                    : '🔴 Support team is offline'}
                </span>
              </div>
              <p
                className={`text-xs ${isCurrentlyBusinessHours ? 'text-green-700' : 'text-orange-700'}`}
              >
                Business hours: Monday - Friday, 10:00 AM - 5:00 PM IST
              </p>
              <p
                className={`text-xs mt-1 ${isCurrentlyBusinessHours ? 'text-green-600' : 'text-orange-600'}`}
              >
                {businessHoursMessage}
              </p>
            </div>

            {/* Success Message */}
            {ticketCreated ? (
              <Card className="mb-8 bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Ticket className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Ticket Created Successfully!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      We've received your support ticket and will respond within 24-48 hours.
                    </p>
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={() => navigate('/support/my-tickets')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        View My Tickets
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setTicketCreated(false)}
                      >
                        Create Another Ticket
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Ticket Form */
              <Card>
                <CardContent className="pt-6">
                  <ContactTicketForm onSuccess={handleTicketSuccess} />
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
                Other ways to get help
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {helpLinks.map((link, index) => (
                  <Link
                    key={index}
                    to={link.href}
                    className="flex items-center justify-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-teal-500 hover:shadow-sm transition-all"
                  >
                    <link.icon className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};

export default Contact;
