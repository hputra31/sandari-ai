
import React from 'react';
import { Icon as Iconify } from '@iconify/react';

interface IconProps {
  name: string;
  className?: string;
}

// Map internal icon names to Iconify icon keys (using Lucide and Tabler mostly)
const iconMap: Record<string, string> = {
  // UI Core
  logo: 'lucide:hexagon',
  download: 'lucide:download',
  copy: 'lucide:copy',
  trash: 'lucide:trash-2',
  check: 'lucide:check',
  close: 'lucide:x',
  upload: 'lucide:upload-cloud',
  image: 'lucide:image',
  video: 'lucide:video',
  magic: 'lucide:wand-2',
  settings: 'lucide:settings',
  lock: 'lucide:lock',
  logout: 'lucide:log-out',
  warning: 'lucide:alert-triangle',
  info: 'lucide:info',
  json: 'lucide:file-json',
  key: 'lucide:key',
  refresh: 'lucide:refresh-cw',
  pencil: 'lucide:pencil',
  eye: 'lucide:eye',
  
  // Chat / Melda AI
  chat: 'lucide:message-circle',
  send: 'lucide:send',
  minimize: 'lucide:minus',
  robot_head: 'lucide:bot',

  // Enhance Tools
  maximize: 'lucide:maximize',
  focus: 'lucide:focus',
  layers: 'lucide:layers',
  aperture: 'lucide:aperture',
  droplet: 'lucide:droplet',
  wand: 'lucide:wand-2',

  // Templates & Tools
  camera: 'lucide:camera',
  user: 'lucide:user',
  users_switch: 'lucide:users', // New Icon for Multiple Swap Face
  food: 'lucide:utensils',
  mountain: 'lucide:mountain',
  diamond: 'lucide:gem',
  palette: 'lucide:palette',
  tshirt: 'lucide:shirt',
  sofa: 'lucide:sofa',
  dress: 'tabler:dress', 
  city: 'lucide:building-2',
  cat: 'lucide:cat',
  film: 'lucide:film',
  mobile: 'lucide:smartphone',
  chart: 'lucide:bar-chart-3',
  beach: 'lucide:palmtree',
  gamepad: 'lucide:gamepad-2',
  play: 'lucide:play',
  shoe: 'tabler:shoe',
  night: 'lucide:moon',
  leaf: 'lucide:leaf',
  ghost: 'lucide:ghost',
  building: 'lucide:building',
  sword: 'lucide:sword',
  blue_bg: 'lucide:square', 
  red_bg: 'lucide:square',
  suit: 'lucide:briefcase',
  clock: 'lucide:clock',
  flower: 'lucide:flower-2',
  bear: 'lucide:paw-print',
  sparkles: 'lucide:sparkles',
  scissors: 'lucide:scissors',
  robot: 'lucide:bot',
  passport: 'lucide:book-user',
  target: 'lucide:target',
  unicorn: 'tabler:horse-toy',
  megaphone: 'lucide:megaphone',
  clapperboard: 'lucide:clapperboard',
  pan: 'lucide:chef-hat',
  affiliate: 'lucide:award',
  audio: 'lucide:volume-2',
  mic: 'lucide:mic'
};

export const Icon: React.FC<IconProps> = ({ name, className }) => {
  const iconName = iconMap[name] || 'lucide:help-circle'; // Fallback icon

  return (
    <Iconify 
      icon={iconName} 
      className={className} 
      width="1em" 
      height="1em" 
    />
  );
};

export default Icon;
