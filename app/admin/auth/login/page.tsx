'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Eye, EyeOff, Headset, LayoutGrid, Loader2, Lock, Mail } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isValidImageSrc } from '@/lib/utils/image';
import { cn } from '@/app/admin/components/ui';
import { useAdminAuth } from '../context';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAdminAuth();

  const siteSettings = useQuery(api.settings.getMultiple, {
    keys: ['site_name', 'site_logo', 'site_favicon', 'admin_support_hotline', 'contact_phone'],
  });

  const siteName = (siteSettings?.site_name as string)?.trim() || 'VietAdmin';
  const siteLogo = (siteSettings?.site_logo as string)?.trim() || '';
  const siteFavicon = (siteSettings?.site_favicon as string)?.trim() || '';
  const contactPhone =
    (siteSettings?.admin_support_hotline as string)?.trim() ||
    (siteSettings?.contact_phone as string)?.trim() ||
    '0948066514';

  const brandIcon = (siteFavicon && isValidImageSrc(siteFavicon))
    ? siteFavicon
    : (siteLogo && isValidImageSrc(siteLogo))
      ? siteLogo
      : '';

  const [iconError, setIconError] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        router.push('/admin');
      } else {
        setError(result.message || 'Email hoặc mật khẩu không chính xác');
      }
    } catch {
      setError('Có lỗi xảy ra khi kết nối máy chủ đăng nhập');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 text-blue-600 animate-spin" />
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Đang xác thực hệ thống...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 md:p-8 antialiased selection:bg-blue-600 selection:text-white">
      {/* Outer Card Container */}
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-[520px]">

        {/* Left Hero & Branding Panel (Desktop Only) */}
        <div className="md:col-span-5 hidden md:flex flex-col justify-between p-8 lg:p-10 bg-slate-950 border-r border-slate-800 select-none">

          {/* Top Brand Logo & Name */}
          <div className="flex items-center gap-3.5">
            {brandIcon && !iconError ? (
              <div className="w-11 h-11 rounded-2xl bg-white p-1.5 shadow-lg border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brandIcon}
                  alt={siteName}
                  onError={() => setIconError(true)}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shrink-0">
                <LayoutGrid className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span
                className={cn(
                  "font-bold text-white tracking-tight leading-snug line-clamp-2 break-words block",
                  siteName.length > 28 ? "text-sm" : siteName.length > 18 ? "text-base" : "text-lg"
                )}
                title={siteName}
              >
                {siteName}
              </span>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">
                Hệ thống quản trị
              </p>
            </div>
          </div>

          {/* Middle Hero Content */}
          <div className="my-auto py-6">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Chào mừng bạn quay lại
              <span className="block text-blue-500 mt-1">
                quản lý website
              </span>
            </h1>
          </div>

          {/* Bottom Support Info Card */}
          {contactPhone && (
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Headset className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">Cần hỗ trợ truy cập?</p>
                <a
                  href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                  className="text-xs font-medium text-blue-400 hover:underline truncate block mt-0.5"
                >
                  Hotline: {contactPhone}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right Login Form Panel */}
        <div className="md:col-span-7 flex flex-col justify-center p-6 sm:p-10 md:p-12 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          
          {/* Mobile Header (Shown on mobile screens only) */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            {brandIcon && !iconError ? (
              <div className="w-11 h-11 rounded-2xl bg-white p-1.5 shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brandIcon}
                  alt={siteName}
                  onError={() => setIconError(true)}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
                <LayoutGrid className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span
                className={cn(
                  "font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2 break-words block",
                  siteName.length > 28 ? "text-sm" : siteName.length > 18 ? "text-base" : "text-lg"
                )}
                title={siteName}
              >
                {siteName}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">Quản trị hệ thống</p>
            </div>
          </div>

          {/* Header Title */}
          <div className="space-y-1.5 mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Đăng nhập tài khoản
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Vui lòng nhập thông tin tài khoản được cấp để tiếp tục.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="admin-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Địa chỉ Email
              </label>
              <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 transition-all">
                <Mail className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent px-3 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                  placeholder="admin@example.com"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="admin-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => alert(`Vui lòng liên hệ SĐT ${contactPhone} để được hỗ trợ khôi phục mật khẩu.`)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 transition-all">
                <Lock className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent px-3 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 mr-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 mt-2 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
