'use client';

import { memo } from 'react';

// Icon color mapping by extension
const extensionColors: Record<string, string> = {
  ts: '#3178c6',
  tsx: '#3178c6',
  js: '#f7df1e',
  jsx: '#61dafb',
  mjs: '#f7df1e',
  cjs: '#f7df1e',
  css: '#264de4',
  scss: '#cd6799',
  sass: '#cd6799',
  less: '#1d365d',
  html: '#e34c26',
  htm: '#e34c26',
  xml: '#e37933',
  svg: '#ffb13b',
  json: '#cbcb41',
  yaml: '#cb171e',
  yml: '#cb171e',
  toml: '#9c4121',
  md: '#519aba',
  mdx: '#519aba',
  txt: '#89909d',
  env: '#ecd53f',
  gitignore: '#f14e32',
  png: '#a074c4',
  jpg: '#a074c4',
  jpeg: '#a074c4',
  gif: '#a074c4',
  webp: '#a074c4',
  ico: '#a074c4',
  sh: '#4eaa25',
  bash: '#4eaa25',
  py: '#3776ab',
  rb: '#cc342d',
  go: '#00add8',
  rs: '#dea584',
  java: '#ed8b00',
  kt: '#7f52ff',
  swift: '#f05138',
  c: '#555555',
  cpp: '#f34b7d',
  h: '#555555',
  cs: '#239120',
  php: '#777bb4',
  sql: '#e38c00',
  graphql: '#e535ab',
};

// Folder colors by name
const folderColors: Record<string, string> = {
  src: '#42a5f5',
  lib: '#42a5f5',
  app: '#66bb6a',
  pages: '#66bb6a',
  components: '#ab47bc',
  hooks: '#ec407a',
  utils: '#ffca28',
  helpers: '#ffca28',
  services: '#26a69a',
  api: '#ef5350',
  types: '#7e57c2',
  models: '#8d6e63',
  styles: '#29b6f6',
  assets: '#ff7043',
  images: '#ff7043',
  public: '#78909c',
  config: '#90a4ae',
  tests: '#9ccc65',
  __tests__: '#9ccc65',
  test: '#9ccc65',
  node_modules: '#689f38',
  dist: '#546e7a',
  build: '#546e7a',
  '.git': '#f14e32',
  '.vscode': '#007acc',
};

interface DefaultIconProps {
  type: 'file' | 'folder';
  name?: string;
  expanded?: boolean;
  size?: number;
}

export const DefaultTreeIcon = memo(function DefaultTreeIcon({
  type,
  name,
  expanded,
  size = 16,
}: DefaultIconProps) {
  if (type === 'folder') {
    return <FolderIcon expanded={expanded} size={size} name={name} />;
  }

  const extension = name?.split('.').pop()?.toLowerCase();
  const color = extension ? (extensionColors[extension] ?? '#89909d') : '#89909d';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path d="M13 14H3V2h7l3 3v9z" fill={color} opacity={0.15} />
      <path
        d="M13 5V14H3V2h7m3 3l-3-3v3h3z"
        stroke={color}
        strokeWidth={1}
        fill="none"
      />
      {extension && (
        <text
          x="8"
          y="11"
          fontSize="4"
          fontWeight="600"
          fill={color}
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
        >
          {extension.slice(0, 3).toUpperCase()}
        </text>
      )}
    </svg>
  );
});

const FolderIcon = memo(function FolderIcon({
  expanded,
  size = 16,
  name,
}: {
  expanded?: boolean;
  size?: number;
  name?: string;
}) {
  const lowerName = name?.toLowerCase();
  const color = (lowerName ? folderColors[lowerName] : undefined) ?? '#90a4ae';

  if (expanded) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <path d="M1.5 3h4l1.5 1.5H14.5v9h-13V3z" fill={color} opacity={0.25} />
        <path d="M1.5 6.5h13l-1.5 7h-10l-1.5-7z" fill={color} opacity={0.4} />
        <path
          d="M1.5 3h4l1.5 1.5H14.5v9h-13V3z"
          stroke={color}
          strokeWidth={1}
          fill="none"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path d="M1.5 3h4l1.5 1.5H14.5v9h-13V3z" fill={color} opacity={0.25} />
      <path
        d="M1.5 3h4l1.5 1.5H14.5v9h-13V3z"
        stroke={color}
        strokeWidth={1}
        fill="none"
      />
    </svg>
  );
});

export const ChevronIcon = memo(function ChevronIcon({
  expanded,
  size = 12,
}: {
  expanded: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="currentColor"
      style={{
        flexShrink: 0,
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.1s ease',
      }}
    >
      <path d="M4.5 2L9 6l-4.5 4V2z" />
    </svg>
  );
});

// Action icons
export const SearchIcon = memo(function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
    </svg>
  );
});

export const NewFileIcon = memo(function NewFileIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.5 1.1l3.4 3.4V14H3V1h6.5zm0 1H4v11h8V5h-2.5V2.1zM8 7v2H6v1h2v2h1V10h2V9H9V7H8z" />
    </svg>
  );
});

export const NewFolderIcon = memo(function NewFolderIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M14 4H9.618l-1-2H2v12h12V4zm-1 3v1H9v2H8V8H4V7h4V5h1v2h4z" />
    </svg>
  );
});

export const ExpandAllIcon = memo(function ExpandAllIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 4l4 4 4-4v2l-4 4-4-4V4zm0 5l4 4 4-4v2l-4 4-4-4V9z" />
    </svg>
  );
});

export const CollapseAllIcon = memo(function CollapseAllIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M12 12l-4-4-4 4v-2l4-4 4 4v2zm0-5l-4-4-4 4V5l4-4 4 4v2z" />
    </svg>
  );
});

export const CloseIcon = memo(function CloseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
    </svg>
  );
});

export const RefreshIcon = memo(function RefreshIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.5 2v5h-5l1.8-1.8A4.5 4.5 0 1 0 12.4 11l1.1.6a5.5 5.5 0 1 1-2.7-7.4L13.5 2z" />
    </svg>
  );
});
