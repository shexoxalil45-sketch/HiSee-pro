import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { motion } from 'motion/react';
import { TrendingUp, Award, Zap, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

const usageData = [
  { name: 'AI Video', value: 450, color: '#6366f1' },
  { name: 'AI Thinking', value: 320, color: '#a855f7' },
  { name: 'Studio Edit', value: 180, color: '#ec4899' },
  { name: 'Templates', value: 120, color: '#f43f5e' },
  { name: 'Camera', value: 90, color: '#f97316' },
];

const growthData = [
  { month: 'Jan', posts: 12, views: 1200 },
  { month: 'Feb', posts: 18, views: 1800 },
  { month: 'Mar', posts: 25, views: 3200 },
  { month: 'Apr', posts: 42, views: 5600 },
  { month: 'May', posts: 38, views: 4800 },
  { month: 'Jun', posts: 55, views: 8900 },
  { month: 'Jul', posts: 72, views: 12400 },
];

const CreativeStats: React.FC<{ lang: 'ar' | 'en' }> = ({ lang }) => {
  const isAr = lang === 'ar';

  return (
    <div className="w-full h-full flex flex-col gap-6 p-4 sm:p-6 overflow-y-auto no-scrollbar pb-32">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: isAr ? 'إجمالي الإبداعات' : 'Total Creations', value: '254', icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: isAr ? 'نقاط الخبرة' : 'Exp Points', value: '12.5k', icon: Award, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: isAr ? 'نمو شهري' : 'Monthly Growth', value: '+42%', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${stat.bg} border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center`}
          >
            <stat.icon size={16} className={`${stat.color} mb-1`} />
            <span className="text-white text-sm font-black tracking-tighter">{stat.value}</span>
            <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Tool Usage Pie Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden"
      >
        <div className="flex items-center gap-2 mb-6">
          <PieChartIcon size={18} className="text-indigo-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-tighter">
            {isAr ? 'توزيع استخدام الأدوات' : 'Tool Usage Distribution'}
          </h3>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={usageData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {usageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Content Growth Area Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 border border-white/10 rounded-3xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Activity size={18} className="text-emerald-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-tighter">
            {isAr ? 'نمو المحتوى الإبداعي' : 'Creative Content Growth'}
          </h3>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="posts" stroke="#10b981" fillOpacity={1} fill="url(#colorPosts)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Views Comparison Bar Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white/5 border border-white/10 rounded-3xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={18} className="text-rose-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-tighter">
            {isAr ? 'إحصائيات المشاهدات' : 'View Statistics'}
          </h3>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
              />
              <Bar dataKey="views" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default CreativeStats;
