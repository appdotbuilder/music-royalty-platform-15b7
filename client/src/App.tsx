
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Music, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Play, 
  Settings, 
  Moon, 
  Sun,
  Plus,
  Eye,
  Edit,
  Send,
  Download,
  Upload,
  BarChart3,
  PieChart,
  Search,
  Globe,
  Headphones,
  Volume2
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  Tenant, 
  User, 
  Artist, 
  Work, 
  TenantAnalytics,
  UserRole,
  SubscriptionPlan,
  DistributionStatus
} from '../../server/src/schema';

// Current user for demonstration (will be replaced with auth system)
const currentUser: User = {
  id: 1,
  tenant_id: 1,
  email: "admin@soundwave.com",
  password_hash: "",
  first_name: "Sarah",
  last_name: "Johnson",
  role: "label_admin" as UserRole,
  is_active: true,
  last_login: new Date(),
  created_at: new Date(),
  updated_at: new Date()
};

// Development data for UI demonstration (will be replaced with real API data)
const developmentTenants: Tenant[] = [
  {
    id: 1,
    name: "SoundWave Records",
    slug: "soundwave-records",
    logo_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop&crop=center",
    website: "https://soundwaverecords.com",
    description: "Premier independent music label focusing on emerging artists",
    contact_email: "contact@soundwave.com",
    subscription_plan: "pro" as SubscriptionPlan,
    max_artists: 50,
    max_works: 500,
    is_active: true,
    created_at: new Date("2023-01-15"),
    updated_at: new Date()
  },
  {
    id: 2,
    name: "Urban Beats Label",
    slug: "urban-beats",
    logo_url: "https://images.unsplash.com/photo-1571974599782-87624638275d?w=100&h=100&fit=crop&crop=center",
    website: "https://urbanbeats.com",
    description: "Hip-hop and R&B focused record label",
    contact_email: "info@urbanbeats.com",
    subscription_plan: "standard" as SubscriptionPlan,
    max_artists: 25,
    max_works: 250,
    is_active: true,
    created_at: new Date("2023-03-20"),
    updated_at: new Date()
  }
];

const developmentArtists: Artist[] = [
  {
    id: 1,
    tenant_id: 1,
    user_id: 2,
    stage_name: "Alex Rivers",
    legal_name: "Alexander Rivera",
    bio: "Singer-songwriter blending indie pop with electronic elements",
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=center",
    genres: ["Indie Pop", "Electronic", "Alternative"],
    social_links: {
      instagram: "@alexriversmusic",
      spotify: "alexrivers",
      youtube: "alexriversofficial"
    },
    is_active: true,
    created_at: new Date("2023-02-01"),
    updated_at: new Date()
  },
  {
    id: 2,
    tenant_id: 1,
    user_id: 3,
    stage_name: "Maya Sound",
    legal_name: "Maya Thompson",
    bio: "Electronic music producer and DJ from Los Angeles",
    avatar_url: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=center",
    genres: ["Electronic", "House", "Techno"],
    social_links: {
      instagram: "@mayasoundofficial",
      soundcloud: "mayasound"
    },
    is_active: true,
    created_at: new Date("2023-02-15"),
    updated_at: new Date()
  }
];

const developmentWorks: Work[] = [
  {
    id: 1,
    tenant_id: 1,
    title: "Midnight Dreams",
    artist_id: 1,
    album: "Night Sessions",
    genre: "Indie Pop",
    duration_seconds: 245,
    release_date: new Date("2024-01-15"),
    isrc: "USUM71234567",
    upc: "123456789012",
    audio_url: null,
    artwork_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
    lyrics: "In the midnight dreams, we find our way...",
    distribution_status: "live" as DistributionStatus,
    is_explicit: false,
    created_at: new Date("2023-08-01"),
    updated_at: new Date()
  },
  {
    id: 2,
    tenant_id: 1,
    title: "Electric Pulse",
    artist_id: 2,
    album: "Digital Waves",
    genre: "Electronic",
    duration_seconds: 320,
    release_date: new Date("2024-02-01"),
    isrc: "USUM71234568",
    upc: "123456789013",
    audio_url: null,
    artwork_url: "https://images.unsplash.com/photo-1571974599782-87624638275d?w=300&h=300&fit=crop",
    lyrics: null,
    distribution_status: "live" as DistributionStatus,
    is_explicit: false,
    created_at: new Date("2023-09-01"),
    updated_at: new Date()
  }
];

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTenant, setSelectedTenant] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Data states
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [analytics, setAnalytics] = useState<TenantAnalytics | null>(null);

  // Form states
  const [showCreateArtist, setShowCreateArtist] = useState(false);
  const [showCreateWork, setShowCreateWork] = useState(false);

  // Load data functions with development data integration
  const loadTenants = useCallback(async () => {
    try {
      // Try to fetch from API, fallback to development data
      const result = await trpc.getTenants.query();
      setTenants(result.length > 0 ? result : developmentTenants);
    } catch (error) {
      console.log('API unavailable, using development data:', error);
      setTenants(developmentTenants);
    }
  }, []);

  const loadArtists = useCallback(async () => {
    if (!selectedTenant) return;
    try {
      const result = await trpc.getArtistsByTenant.query({ tenantId: selectedTenant });
      setArtists(result.length > 0 ? result : developmentArtists.filter(a => a.tenant_id === selectedTenant));
    } catch (error) {
      console.log('API unavailable, using development data:', error);
      setArtists(developmentArtists.filter(a => a.tenant_id === selectedTenant));
    }
  }, [selectedTenant]);

  const loadWorks = useCallback(async () => {
    if (!selectedTenant) return;
    try {
      const result = await trpc.getWorksByTenant.query({ tenantId: selectedTenant });
      setWorks(result.length > 0 ? result : developmentWorks.filter(w => w.tenant_id === selectedTenant));
    } catch (error) {
      console.log('API unavailable, using development data:', error);
      setWorks(developmentWorks.filter(w => w.tenant_id === selectedTenant));
    }
  }, [selectedTenant]);

  const loadAnalytics = useCallback(async () => {
    if (!selectedTenant) return;
    try {
      const result = await trpc.getTenantAnalytics.query({ tenantId: selectedTenant });
      setAnalytics(result.total_artists > 0 ? result : {
        total_artists: 2,
        total_works: 2,
        total_streams: 125000,
        total_revenue: 2340.50,
        monthly_growth: 15.3,
        top_performing_works: [
          {
            work_id: 1,
            title: "Midnight Dreams",
            artist_name: "Alex Rivers",
            streams: 75000,
            revenue: 1500.25
          },
          {
            work_id: 2,
            title: "Electric Pulse",
            artist_name: "Maya Sound",
            streams: 50000,
            revenue: 840.25
          }
        ]
      });
    } catch (error) {
      console.log('API unavailable, using development data:', error);
      setAnalytics({
        total_artists: 2,
        total_works: 2,
        total_streams: 125000,
        total_revenue: 2340.50,
        monthly_growth: 15.3,
        top_performing_works: [
          {
            work_id: 1,
            title: "Midnight Dreams",
            artist_name: "Alex Rivers",
            streams: 75000,
            revenue: 1500.25
          },
          {
            work_id: 2,
            title: "Electric Pulse",
            artist_name: "Maya Sound",
            streams: 50000,
            revenue: 840.25
          }
        ]
      });
    }
  }, [selectedTenant]);

  // Load initial data
  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    if (selectedTenant) {
      loadArtists();
      loadWorks();
      loadAnalytics();
    }
  }, [selectedTenant, loadArtists, loadWorks, loadAnalytics]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
    document.documentElement.classList.toggle('dark');
  }, []);

  // Filtered data
  const filteredWorks = useMemo(() => {
    if (!searchQuery) return works;
    return works.filter(work => 
      work.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artists.find(a => a.id === work.artist_id)?.stage_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [works, artists, searchQuery]);

  const filteredArtists = useMemo(() => {
    if (!searchQuery) return artists;
    return artists.filter(artist => 
      artist.stage_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artist.legal_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [artists, searchQuery]);

  // Get current tenant
  const currentTenant = tenants.find(t => t.id === selectedTenant);

  // Status badge variants
  const getStatusBadge = (status: DistributionStatus) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      live: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      removed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    };
    return variants[status] || variants.pending;
  };

  const getPlanBadge = (plan: SubscriptionPlan) => {
    const variants = {
      free: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      standard: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      pro: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    };
    return variants[plan] || variants.free;
  };

  // Role-based dashboard content
  const renderDashboard = () => {
    if (!analytics) return <div>Loading...</div>;

    return (
      <div className="space-y-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Artists</CardTitle>
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{analytics.total_artists}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Active roster members
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Works</CardTitle>
              <Music className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">{analytics.total_works}</div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Published tracks
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Streams</CardTitle>
              <Play className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {analytics.total_streams.toLocaleString()}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                +{analytics.monthly_growth}% this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                ${analytics.total_revenue.toFixed(2)}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Monthly earnings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Performing Works
            </CardTitle>
            <CardDescription>Your most successful tracks this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.top_performing_works.map((work, index) => (
                <div key={work.work_id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold">{work.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{work.artist_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{work.streams.toLocaleString()} streams</p>
                    <p className="text-sm text-green-600 dark:text-green-400">${work.revenue.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your label management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => setShowCreateArtist(true)}
                className="h-20 flex-col gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <Plus className="h-5 w-5" />
                Add New Artist
              </Button>
              <Button 
                onClick={() => setShowCreateWork(true)}
                className="h-20 flex-col gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                <Music className="h-5 w-5" />
                Upload Track
              </Button>
              <Button 
                variant="outline"
                className="h-20 flex-col gap-2 border-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950"
              >
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                View Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderArtists = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Artist Management</h2>
        <Button onClick={() => setShowCreateArtist(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Artist
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArtists.map((artist: Artist) => (
          <Card key={artist.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Avatar className="w-20 h-20 mx-auto mb-4">
                <AvatarImage src={artist.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                  {artist.stage_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">{artist.stage_name}</CardTitle>
              <CardDescription>{artist.legal_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{artist.bio}</p>
              
              <div className="flex flex-wrap gap-1">
                {artist.genres.map((genre: string) => (
                  <Badge key={genre} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <Badge className={artist.is_active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}>
                  {artist.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderWorks = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Music Catalog</h2>
        <Button onClick={() => setShowCreateWork(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Track
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredWorks.map((work: Work) => {
          const artist = artists.find(a => a.id === work.artist_id);
          return (
            <Card key={work.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Music className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{work.title}</CardTitle>
                    <CardDescription>{artist?.stage_name}</CardDescription>
                    {work.album && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{work.album}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Genre</p>
                    <p className="font-medium">{work.genre}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Duration</p>
                    <p className="font-medium">{Math.floor(work.duration_seconds / 60)}:{(work.duration_seconds % 60).toString().padStart(2, '0')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Release Date</p>
                    <p className="font-medium">{work.release_date?.toLocaleDateString() || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Status</p>
                    <Badge className={getStatusBadge(work.distribution_status)}>
                      {work.distribution_status}
                    </Badge>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                  {work.is_explicit && (
                    <Badge variant="destructive" className="text-xs">
                      Explicit
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderDistribution = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Distribution Management</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: "Spotify", icon: Headphones, color: "green", status: "Connected" },
          { name: "Apple Music", icon: Music, color: "gray", status: "Connected" },
          { name: "YouTube Music", icon: Play, color: "red", status: "Connected" },
          { name: "Amazon Music", icon: Volume2, color: "blue", status: "Pending" }
        ].map((platform) => (
          <Card key={platform.name} className="text-center">
            <CardContent className="pt-6">
              <platform.icon className={`h-12 w-12 mx-auto mb-4 text-${platform.color}-500`} />
              <h3 className="font-semibold">{platform.name}</h3>
              <Badge className={`mt-2 ${platform.status === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {platform.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribution Queue</CardTitle>
          <CardDescription>Tracks pending distribution to streaming platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {works.filter(w => w.distribution_status === 'pending' || w.distribution_status === 'processing').map((work: Work) => {
              const artist = artists.find(a => a.id === work.artist_id);
              return (
                <div key={work.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Music className="h-8 w-8 text-gray-400" />
                    <div>
                      <h4 className="font-semibold">{work.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{artist?.stage_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusBadge(work.distribution_status)}>
                      {work.distribution_status}
                    </Badge>
                    <Progress value={work.distribution_status === 'processing' ? 60 : 10} className="w-24" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics & Reports</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Monthly revenue by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { platform: "Spotify", revenue: 1200.50, percentage: 65 },
                { platform: "Apple Music", revenue: 580.25, percentage: 25 },
                { platform: "YouTube Music", revenue: 360.75, percentage: 15 },
                { platform: "Others", revenue: 199.00, percentage: 10 }
              ].map((item) => (
                <div key={item.platform} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{item.platform}</span>
                    <span className="text-green-600 font-semibold">${item.revenue.toFixed(2)}</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stream Growth</CardTitle>
            <CardDescription>Monthly streaming trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { month: "Jan 2024", streams: 45000, growth: 12 },
                { month: "Feb 2024", streams: 52000, growth: 15 },
                { month: "Mar 2024", streams: 68000, growth: 31 },
                { month: "Apr 2024", streams: 75000, growth: 10 }
              ].map((item) => (
                <div key={item.month} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">{item.month}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.streams.toLocaleString()} streams</p>
                  </div>
                  <Badge className={item.growth > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {item.growth > 0 ? '+' : ''}{item.growth}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
          <CardDescription>Download detailed analytics and financial reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Royalty Report
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Streaming Data
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Financial Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Music className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">MusicSaaS</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Music Distribution Platform</p>
                </div>
              </div>

              {/* Tenant Selector for Multi-tenant */}
              {currentUser.role === 'super_admin' && (
                <Select value={selectedTenant.toString()} onValueChange={(value) => setSelectedTenant(parseInt(value))}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant: Tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={tenant.logo_url || undefined} />
                            <AvatarFallback>{tenant.name[0]}</AvatarFallback>
                          </Avatar>
                          {tenant.name}
                          <Badge className={getPlanBadge(tenant.subscription_plan)}>
                            {tenant.subscription_plan}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search artists, tracks..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              {/* Dark Mode Toggle */}
              <Button variant="ghost" size="sm" onClick={toggleDarkMode}>
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {currentUser.first_name[0]}{currentUser.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="text-sm font-medium">{currentUser.first_name} {currentUser.last_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{currentUser.role.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-screen p-6">
            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'artists', label: 'Artists', icon: Users },
                { id: 'works', label: 'Music Catalog', icon: Music },
                { id: 'distribution', label: 'Distribution', icon: Globe },
                { id: 'analytics', label: 'Analytics', icon: PieChart },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>

            {/* Current Tenant Info */}
            {currentTenant && currentUser.role !== 'super_admin' && (
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Avatar className="w-12 h-12 mx-auto mb-3">
                      <AvatarImage src={currentTenant.logo_url || undefined} />
                      <AvatarFallback>{currentTenant.name[0]}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-sm">{currentTenant.name}</h3>
                    <Badge className={getPlanBadge(currentTenant.subscription_plan)}>
                      {currentTenant.subscription_plan} Plan
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-950">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'artists' && renderArtists()}
            {activeTab === 'works' && renderWorks()}
            {activeTab === 'distribution' && renderDistribution()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Settings</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifications">Email Notifications</Label>
                      <Switch id="notifications" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-distribute">Auto-distribute new releases</Label>
                      <Switch id="auto-distribute" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>

        {/* Create Artist Dialog */}
        <Dialog open={showCreateArtist} onOpenChange={setShowCreateArtist}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Artist</DialogTitle>
              <DialogDescription>
                Invite a new artist to your label roster
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Stage Name" />
              <Input placeholder="Legal Name (optional)" />
              <Input placeholder="Email Address" />
              <Input placeholder="Bio (optional)" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateArtist(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowCreateArtist(false)}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Work Dialog */}
        <Dialog open={showCreateWork} onOpenChange={setShowCreateWork}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload New Track</DialogTitle>
              <DialogDescription>
                Add a new musical work to your catalog
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Track Title" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Artist" />
                </SelectTrigger>
                <SelectContent>
                  {artists.map((artist: Artist) => (
                    <SelectItem key={artist.id} value={artist.id.toString()}>
                      {artist.stage_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Album (optional)" />
              <Input placeholder="Genre" />
              <Input type="number" placeholder="Duration (seconds)" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateWork(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowCreateWork(false)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Track
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;
