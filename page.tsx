"use client";

import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Search, Users, Eye, Video, ThumbsUp, MessageSquare, Download, Filter, TrendingUp, Calendar } from "lucide-react";

const formatNumber = (num: string | number) => {
  const n = typeof num === 'string' ? parseInt(num, 10) : num;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  
  // Rate Limiting State
  const [cooldown, setCooldown] = useState(0);

  // Controls
  const [timeframe, setTimeframe] = useState("30"); 
  const [sortBy, setSortBy] = useState("date"); 

  // Cooldown Timer Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enforce 30-second limit
    if (cooldown > 0) {
      setError(`Demo limit: Please wait ${cooldown} seconds before analyzing another channel.`);
      return;
    }

    setIsLoading(true);
    setError("");
    setData(null);
    
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Something went wrong");
      setData(result);
      
      // Trigger 30-second cooldown after a successful search
      setCooldown(30);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and Sort Logic
  const processedVideos = useMemo(() => {
    if (!data?.recentVideos) return [];
    
    let filtered = [...data.recentVideos];
    const now = new Date();

    if (timeframe !== "all") {
      const days = parseInt(timeframe);
      filtered = filtered.filter(vid => {
        const diffTime = Math.abs(now.getTime() - new Date(vid.publishedAt).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= days;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === "views") return b.views - a.views;
      if (sortBy === "likes") return b.likes - a.likes;
      if (sortBy === "comments") return b.comments - a.comments;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return filtered;
  }, [data, timeframe, sortBy]);

  const exportToCSV = () => {
    if (!processedVideos.length) return;
    const headers = ["Title", "Published Date", "Views", "Likes", "Comments", "Video URL"];
    const csvRows = processedVideos.map(v => 
      `"${v.title.replace(/"/g, '""')}","${formatDate(v.publishedAt)}",${v.views},${v.likes},${v.comments},https://youtube.com/watch?v=${v.id}`
    );
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${data.title}_analytics.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex flex-col items-center p-6 sm:p-12 w-full max-w-7xl mx-auto">
        
        {/* Dynamic Header */}
        <div className={`transition-all duration-500 w-full text-center ${data ? "mb-8 mt-4" : "mb-12 mt-24"}`}>
          <h1 className={`${data ? "text-3xl" : "text-5xl md:text-6xl"} font-extrabold tracking-tight text-slate-900 mb-4 transition-all`}>
            Tube<span className="text-red-600">Metrics</span>
          </h1>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-3xl bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="url"
                placeholder="https://youtube.com/@mkbhd"
                className="w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none text-slate-700 text-lg bg-slate-50 focus:bg-white"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading || cooldown > 0} 
              className={`px-8 py-3 font-semibold rounded-xl transition-all min-w-[120px] ${
                cooldown > 0 
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed" 
                  : "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-400"
              }`}
            >
              {isLoading ? "Fetching..." : cooldown > 0 ? `Wait ${cooldown}s` : "Analyze"}
            </button>
          </form>
        </div>

        {/* Cooldown / Error Messages */}
        {cooldown > 0 && !error && (
          <p className="text-sm text-amber-600 font-medium mb-4">
            ⏱️ Demo Mode: Please wait {cooldown} seconds before searching again.
          </p>
        )}
        {error && <div className="p-4 mb-8 w-full max-w-3xl bg-red-50 text-red-600 border border-red-200 rounded-xl text-center">{error}</div>}

        {/* Results Dashboard */}
        {data && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header Stats */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.thumbnail} alt="Avatar" className="w-20 h-20 rounded-full border border-slate-100" />
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{data.title}</h2>
                  <p className="text-slate-500 line-clamp-1 max-w-md mt-1">{data.description}</p>
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div><p className="text-slate-500 text-sm">Subscribers</p><p className="font-bold text-xl">{formatNumber(data.stats.subscribers)}</p></div>
                <div><p className="text-slate-500 text-sm">Total Views</p><p className="font-bold text-xl">{formatNumber(data.stats.views)}</p></div>
                <div><p className="text-slate-500 text-sm">Videos</p><p className="font-bold text-xl">{formatNumber(data.stats.videos)}</p></div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-red-500 p-2 outline-none cursor-pointer">
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 3 Months</option>
                    <option value="180">Last 6 Months</option>
                    <option value="all">Last 50 Videos</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-red-500 p-2 outline-none cursor-pointer">
                    <option value="date">Sort by Newest</option>
                    <option value="views">Sort by Most Viewed</option>
                    <option value="likes">Sort by Most Liked</option>
                    <option value="comments">Sort by Most Commented</option>
                  </select>
                </div>
                <span className="text-sm text-slate-500 ml-2 border-l border-slate-200 pl-4">
                  Showing {processedVideos.length} videos
                </span>
              </div>
              <button onClick={exportToCSV} className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            {/* Reverted Clean Bar Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-500"/> View Velocity
              </h3>
              <div className="h-[300px] w-full">
                {processedVideos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedVideos.slice(0, 15).reverse()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="title" hide />
                      <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => formatNumber(val)} width={60} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}} 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        labelFormatter={(label) => label.substring(0, 40) + "..."}
                        formatter={(value: any) => [value.toLocaleString(), "Views"]}
                      />
                      <Bar dataKey="views" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">No data for this period</div>
                )}
              </div>
            </div>

            {/* Video Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {processedVideos.map((video: any) => (
                <a key={video.id} href={`https://youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="group flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-red-200 transition-all">
                  <div className="relative aspect-video bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h4 className="font-semibold text-slate-900 line-clamp-2 text-sm mb-4 group-hover:text-red-600 transition-colors" title={video.title}>
                      {video.title}
                    </h4>
                    <div className="mt-auto grid grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5 font-medium"><Eye className="w-4 h-4 text-slate-400" /> {formatNumber(video.views)}</div>
                      <div className="flex items-center gap-1.5 font-medium"><ThumbsUp className="w-4 h-4 text-slate-400" /> {formatNumber(video.likes)}</div>
                      <div className="flex items-center gap-1.5 font-medium"><MessageSquare className="w-4 h-4 text-slate-400" /> {formatNumber(video.comments)}</div>
                      <div className="flex items-center gap-1.5 font-medium"><Calendar className="w-4 h-4 text-slate-400" /> {formatDate(video.publishedAt)}</div>
                    </div>
                  </div>
                </a>
              ))}
              {processedVideos.length === 0 && (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                  <Video className="w-12 h-12 text-slate-300 mb-3" />
                  <p>No videos found for this timeframe.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Demo Footer & Copyright */}
      <footer className="w-full mt-auto py-8 text-center text-slate-500 text-sm border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="mb-3 font-semibold text-slate-700 bg-slate-200 inline-block px-3 py-1 rounded-md">
            ⚠️ Note: This is a Demo Project.
          </p>
          <p className="mb-1">
            &copy; {new Date().getFullYear()} Sumit Rajwani. All rights reserved.
          </p>
          <p>
            Contact: <a href="mailto:sumitrajwani2003@gmail.com" className="text-red-600 hover:underline font-medium">sumitrajwani2003@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}