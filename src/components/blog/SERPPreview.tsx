import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SERPPreview as SERPPreviewType } from '@/types/blog';
import { Search } from 'lucide-react';

interface SERPPreviewProps {
  preview: SERPPreviewType;
}

export const SERPPreview: React.FC<SERPPreviewProps> = ({ preview }) => {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Search size={16} />
          Google Search Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white border rounded-lg p-4 font-sans">
          {/* Breadcrumb */}
          {preview.breadcrumb && (
            <div className="text-sm text-gray-600 mb-1">{preview.breadcrumb}</div>
          )}

          {/* Title */}
          <h3 className="text-teal-700 hover:text-teal-800 text-xl leading-6 mb-1 cursor-pointer">
            {preview.title}
          </h3>

          {/* URL */}
          <div className="text-green-700 text-sm mb-2">{preview.url}</div>

          {/* Description */}
          <div className="text-gray-600 text-sm leading-5">{preview.description}</div>

          {/* Additional info */}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              Blog Post
            </Badge>
            <span className="text-xs text-gray-500">• iwishBag</span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> This is how your blog post will appear in Google search results.
            Optimize your title and meta description to improve click-through rates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
