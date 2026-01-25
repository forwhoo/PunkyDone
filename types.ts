import React from 'react';

export interface Artist {
  id: string;
  name: string;
  image: string;
  totalListens: number;
  trend: number; // Percentage growth
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year: number;
  totalListens: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  listens: number;
  dailyChange: number;
}

export interface ChartDataPoint {
  day: string;
  listens: number;
}

export interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}