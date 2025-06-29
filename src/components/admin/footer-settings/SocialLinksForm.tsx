import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SocialLinksFormProps {
  formData: {
    facebook_url: string;
    twitter_url: string;
    instagram_url: string;
    linkedin_url: string;
    youtube_url: string;
  };
  handleInputChange: (field: string, value: string) => void;
}

export const SocialLinksForm = ({ formData, handleInputChange }: SocialLinksFormProps) => {
  return (
    <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
      <CardHeader>
        <CardTitle className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Social Media Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="facebook_url">Facebook URL</Label>
          <Input
            id="facebook_url"
            type="url"
            value={formData.facebook_url}
            onChange={(e) => handleInputChange('facebook_url', e.target.value)}
            placeholder="https://facebook.com/yourpage"
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="twitter_url">Twitter URL</Label>
          <Input
            id="twitter_url"
            type="url"
            value={formData.twitter_url}
            onChange={(e) => handleInputChange('twitter_url', e.target.value)}
            placeholder="https://twitter.com/yourhandle"
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="instagram_url">Instagram URL</Label>
          <Input
            id="instagram_url"
            type="url"
            value={formData.instagram_url}
            onChange={(e) => handleInputChange('instagram_url', e.target.value)}
            placeholder="https://instagram.com/yourprofile"
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input
            id="linkedin_url"
            type="url"
            value={formData.linkedin_url}
            onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
            placeholder="https://linkedin.com/company/yourcompany"
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="youtube_url">YouTube URL</Label>
          <Input
            id="youtube_url"
            type="url"
            value={formData.youtube_url}
            onChange={(e) => handleInputChange('youtube_url', e.target.value)}
            placeholder="https://youtube.com/@yourchannel"
            className="backdrop-blur-xl bg-white/20 border-white/20 focus:border-primary/50"
          />
        </div>
      </CardContent>
    </Card>
  );
};

