import React from 'react';

export interface Artist {
  id: string;
  name: string;
  image: string;
  totalListens: number;
  trend: number; // Percentage growth
  rank?: number;
  peak?: number;
  prev?: number;
  streak?: number;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year: number;
  totalListens: number;
  rank?: number;
  peak?: number;
  prev?: number;
  streak?: number;
  trend?: number;
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
  rank?: number;
  peak?: number;
  prev?: number;
  streak?: number;
  trend?: number;
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