/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Main Application Component: المدرب الأسطورة (The Legendary Coach)
 */

import React, { useEffect, useState } from 'react';
import { useGameStore } from './state/useGameStore';
import { FirebaseProvider, useFirebase } from './firebase/FirebaseContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { TacticalBoardView } from './components/TacticalBoardView';
import { LiveMatchView } from './components/LiveMatchView';
import { StoryMissionsView } from './components/StoryMissionsView';
import { SquadView } from './components/SquadView';
import { TrainingAcademyView } from './components/TrainingAcademyView';
import { TransfersMarketView } from './components/TransfersMarketView';
import { ClubFacilitiesView } from './components/ClubFacilitiesView';
import { LeagueTableView } from './components/LeagueTableView';
import { LeagueCalendarView } from './components/LeagueCalendarView';
import { VIPClubView } from './components/VIPClubView';
import { DataPackEditorView } from './components/DataPackEditorView';
import { FootballApiView } from './components/FootballApiView';
import { FootballApiAdminView } from './components/FootballApiAdminView';
import { AuthModal } from './components/AuthModal';
import { InitialClubSelectModal } from './components/InitialClubSelectModal';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { MatchResultsCharacterModal } from './components/MatchResultsCharacterModal';
import { TacticalDuelModal } from './components/TacticalDuelModal';
import { PreMatchView } from './components/PreMatchView';
import { RoundSummaryView } from './components/RoundSummaryView';
import { SeasonFinaleModal } from './components/SeasonFinaleModal';
import { hydrateLiveLeagues } from './services/liveLeaguesService';

function MainAppLayout() {
  const { activeTab, language, preMatchModalOpen } = useGameStore();
  const { authModalOpen, setAuthModalOpen, user, loading } = useFirebase();
  const isAr = language === 'ar';

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Complete any facility upgrades whose construction timer has finished
  // (once on load to catch offline completions, then a light periodic check).
  useEffect(() => {
    const { processFacilityUpgrades } = useGameStore.getState();
    processFacilityUpgrades();
    const interval = setInterval(() => {
      useGameStore.getState().processFacilityUpgrades();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Load the full live club lists once at startup so standings, fixtures and opponents
  // (also for a saved game that never reopens the club picker) use every real club.
  useEffect(() => {
    hydrateLiveLeagues();
  }, []);

  // Prompt login on initial load if not logged in and not already chosen
  useEffect(() => {
    const hasSeenWelcome = sessionStorage.getItem('has_seen_welcome_prompt');
    if (!loading && !user && !hasSeenWelcome) {
      sessionStorage.setItem('has_seen_welcome_prompt', 'true');
      setAuthModalOpen(true);
    }
  }, [loading, user]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'scout':
        return <FootballApiView />;
      case 'football_api':
        return <FootballApiAdminView />;
      case 'tactics':
        return <TacticalBoardView />;
      case 'match':
        return <LiveMatchView />;
      case 'story':
        return <StoryMissionsView />;
      case 'squad':
        return <SquadView />;
      case 'training':
        return <TrainingAcademyView />;
      case 'transfers':
        return <TransfersMarketView />;
      case 'club':
        return <ClubFacilitiesView />;
      case 'league':
        return <LeagueTableView />;
      case 'calendar':
        return <LeagueCalendarView />;
      case 'vip':
        return <VIPClubView />;
      case 'editor':
        return <DataPackEditorView />;
      case 'round_summary':
        return <RoundSummaryView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top Application Bar */}
      <Header />

      {/* Global Navigation */}
      <Navigation />

      {/* Main View Area */}
      <main className="flex-1 pb-16 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4">
        {renderActiveView()}
      </main>

      {/* Auth & 300 Gems Reward Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />

      {/* Official League & Club Selection Modal */}
      <InitialClubSelectModal />

      {/* Daily Missions System */}
      <DailyMissionsModal />

      {/* Post Match Results Character & Tactical Analyst (الكابتن منصور) */}
      <MatchResultsCharacterModal />

      {/* Simultaneous Reveal Tactical Duel (صانع المعارك) */}
      <TacticalDuelModal />

      {/* Pre-Match Tactical Preview (معاينة ما قبل صافرة البداية) */}
      {preMatchModalOpen && <PreMatchView />}

      {/* Season Finale Modal (ختام الموسم وحصاد البطولة) */}
      <SeasonFinaleModal />

      {/* Footer */}
      <footer className="bg-slate-950/90 border-t border-slate-900 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>المدرب الأسطورة (The Legendary Coach) • الإصدار الواقعي 2.0.0</span>
          <span>{isAr ? 'قاعدة بيانات كرة القدم العالمية الرسمية وحفظ السحابة عبر Firebase Firestore' : 'Official World Football Database & Firebase Cloud Saves'}</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <MainAppLayout />
    </FirebaseProvider>
  );
}