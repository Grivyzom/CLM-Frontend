import React from 'react';
import {
  SiReact, SiNodedotjs, SiPostgresql, SiDocker, SiJavascript, SiTypescript,
  SiHtml5, SiPython, SiDjango, SiGo, SiGooglecloud,
  SiTailwindcss, SiVuedotjs, SiAngular, SiSvelte, SiNextdotjs,
  SiMongodb, SiRedis, SiMysql, SiFirebase, SiSupabase,
  SiGraphql, SiKubernetes, SiLinux, SiUbuntu,
  SiGit, SiGithub, SiFigma,
  SiVite, SiWebpack, SiRubyonrails, SiPhp, SiLaravel,
  SiCplusplus, SiRust, SiSwift, SiKotlin, SiAndroid, SiApple,
  SiAuth0, SiStripe, SiGithubactions
} from '@icons-pack/react-simple-icons';

const iconMap = {
  react: SiReact,
  'node.js': SiNodedotjs,
  node: SiNodedotjs,
  nodejs: SiNodedotjs,
  postgresql: SiPostgresql,
  postgres: SiPostgresql,
  docker: SiDocker,
  javascript: SiJavascript,
  js: SiJavascript,
  typescript: SiTypescript,
  ts: SiTypescript,
  html: SiHtml5,
  html5: SiHtml5,
  python: SiPython,
  py: SiPython,
  django: SiDjango,
  go: SiGo,
  golang: SiGo,
  gcp: SiGooglecloud,
  tailwind: SiTailwindcss,
  tailwindcss: SiTailwindcss,
  vue: SiVuedotjs,
  'vue.js': SiVuedotjs,
  angular: SiAngular,
  svelte: SiSvelte,
  nextjs: SiNextdotjs,
  'next.js': SiNextdotjs,
  mongodb: SiMongodb,
  mongo: SiMongodb,
  redis: SiRedis,
  mysql: SiMysql,
  firebase: SiFirebase,
  supabase: SiSupabase,
  graphql: SiGraphql,
  kubernetes: SiKubernetes,
  k8s: SiKubernetes,
  linux: SiLinux,
  ubuntu: SiUbuntu,
  git: SiGit,
  github: SiGithub,
  'github actions': SiGithubactions,
  figma: SiFigma,
  vite: SiVite,
  webpack: SiWebpack,
  'ruby on rails': SiRubyonrails,
  rails: SiRubyonrails,
  php: SiPhp,
  laravel: SiLaravel,
  cplusplus: SiCplusplus,
  'c++': SiCplusplus,
  cpp: SiCplusplus,
  rust: SiRust,
  swift: SiSwift,
  kotlin: SiKotlin,
  android: SiAndroid,
  ios: SiApple,
  apple: SiApple,
  auth0: SiAuth0,
  stripe: SiStripe
};

export default function TechIcon({ name, color = 'currentColor', size = 14, className = '', fallback = true }) {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  
  // Try exact match first
  let IconComponent = iconMap[key];

  // Try partial match if not found
  if (!IconComponent) {
    const matchedKey = Object.keys(iconMap).find(k => key.includes(k) || k.includes(key));
    if (matchedKey) {
      IconComponent = iconMap[matchedKey];
    }
  }

  if (IconComponent) {
    return <IconComponent color={color} size={size} className={className} />;
  }

  if (fallback) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    );
  }

  return null;
}
