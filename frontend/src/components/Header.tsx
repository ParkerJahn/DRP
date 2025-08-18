import './Header.css';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import lightLogo from '/lightmodelogo.png';
import darkLogo from '/darkmodelogo.png';
import firebaseApi from '../api/firebase';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';

interface ProfileData {
    first_name: string;
    last_name: string;
    role?: string;
    proStatus?: string;
}

interface NavigationItem {
    path: string;
    label: string;
    icon: string;
}

function Header() {
    const { user, loading } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false); // Changed from isDrawerOpen
    const drawerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Initialize theme from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const shouldBeDark = savedTheme === 'dark';
        setIsDarkMode(shouldBeDark);
        document.documentElement.classList.toggle('dark', shouldBeDark);
    }, []);

    // Check authentication status
    useEffect(() => {
        const checkAuthStatus = async () => {
            const isAuthenticated = firebaseApi.isAuthenticated();
            setIsLoggedIn(isAuthenticated);
            
            if (isAuthenticated && user?.uid) {
                try {
                    const profileData = await firebaseApi.getProfile(user.uid);
                    setProfile(profileData);
                } catch (err) {
                    console.error('Header profile fetch error:', err);
                    setIsLoggedIn(false);
                }
            } else {
                setProfile(null);
            }
        };

        checkAuthStatus();
        const interval = setInterval(checkAuthStatus, 2000);
        return () => clearInterval(interval);
    }, [user]);

    // Close drawer when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
                setIsOpen(false); // Changed from setIsDrawerOpen
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Don't render anything while auth is loading
    if (loading || !user) {
        return null;
    }

    const handleLogout = async () => {
        try {
            await firebaseApi.signOut();
            localStorage.removeItem(ACCESS_TOKEN);
            localStorage.removeItem(REFRESH_TOKEN);
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const toggleDarkMode = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', newTheme);
    };

    // Simple icon component using emojis (no external dependencies)
    const Icon = ({ type, size = "w-5 h-5" }: { type: string; size?: string }) => {
        const iconMap: Record<string, string> = {
            dashboard: "📊",
            profile: "👤",
            team: "👥",
            messages: "💬",
            calendar: "📅",
            programs: "💪",
            payments: "💰",
            menu: "☰",
            close: "✕",
            sun: "☀️",
            moon: "🌙",
            logout: "🚪",
            help: "❓"
        };
        
        return <span className={`text-lg ${size}`}>{iconMap[type] || "•"}</span>;
    };

    // Get navigation items based on user role
    const getNavigationItems = (): NavigationItem[] => {
        const baseItems: NavigationItem[] = [
            { path: '/app/dashboard', label: 'Dashboard', icon: 'dashboard' },
            { path: '/app/profile', label: 'Profile', icon: 'profile' },
        ];

        if (user.role === 'PRO') {
            return [
                ...baseItems,
                { path: '/app/team', label: 'Your Team', icon: 'team' },
                { path: '/app/messages', label: 'Messages', icon: 'messages' },
                { path: '/app/calendar', label: 'Calendar', icon: 'calendar' },
                { path: '/app/payments', label: 'Payments', icon: 'payments' },
                { path: '/app/programs', label: 'SWEATsheet', icon: 'programs' },
            ];
        }

        if (user.role === 'STAFF') {
            return [
                ...baseItems,
                { path: '/app/team', label: 'Your Team', icon: 'team' },
                { path: '/app/messages', label: 'Messages', icon: 'messages' },
                { path: '/app/calendar', label: 'Calendar', icon: 'calendar' },
                { path: '/app/programs', label: 'SWEATsheet', icon: 'programs' },
            ];
        }

        // ATHLETE users get limited features
        return [
            ...baseItems,
            { path: '/app/messages', label: 'Messages', icon: 'messages' },
            { path: '/app/calendar', label: 'Calendar', icon: 'calendar' },
            { path: '/app/programs', label: 'SWEATsheet', icon: 'programs' },
            { path: '/app/payments', label: 'Payments', icon: 'payments' },
        ];
    };

    return (
        <>
            <div className="flex justify-center items-center relative p-5 bg-white dark:bg-neutral-800">
                {/* Profile Avatar */}
                {isLoggedIn && profile && (
                    <a href="/profile" className="cursor-pointer hover:scale-105 transition-transform duration-200 absolute right-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {profile.first_name?.[0]}{profile.last_name?.[0]}
                        </div>
                    </a>
                )}

                {/* Logo */}
                <img 
                    className="block dark:hidden w-[200px] h-[120px] transition-opacity duration-300" 
                    src={lightLogo} 
                    alt="DRP Workshop Light Logo"
                />
                <img 
                    className="hidden dark:block w-[200px] h-[120px] transition-opacity duration-300" 
                    src={darkLogo} 
                    alt="DRP Workshop Dark Logo"
                />

                {/* Navigation Drawer Button */}
                {isLoggedIn && (
                    <div className="flex ml-10 justify-end items-center relative">
                        <button
                            onClick={() => setIsOpen(true)} // Changed from setIsDrawerOpen
                            className="w-15 h-15 cursor-pointer items-center justify-center p-1 bg-gray-300 dark:bg-black text-black dark:text-white rounded shadow hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Icon type="menu" size="w-10 h-10" />
                        </button>
                    </div>
                )}

                {/* Animated line */}
                <div className="animated-line"></div>
            </div>

            {/* Side Drawer */}
            {isOpen && ( // Changed from isDrawerOpen
                <>
                    {/* Overlay */}
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40"
                        onClick={() => setIsOpen(false)} // Changed from setIsDrawerOpen
                    />
                    
                    {/* Drawer */}
                    <div
                        ref={drawerRef}
                        className="fixed top-0 left-0 h-full w-64 bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-neutral-300 dark:border-neutral-600">
                            <h2 className="text-lg font-semibold">Navigation</h2>
                            <button
                                onClick={() => setIsOpen(false)} // Changed from setIsDrawerOpen
                                className="p-2 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded transition-colors"
                            >
                                <Icon type="close" />
                            </button>
                        </div>

                        {/* Theme Toggle */}
                        <div className="p-4 border-b border-neutral-300 dark:border-neutral-600">
                            <button
                                onClick={toggleDarkMode}
                                className="w-full flex items-center justify-between p-3 bg-neutral-300 dark:bg-neutral-600 rounded hover:bg-neutral-400 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <span>Theme</span>
                                {isDarkMode ? <Icon type="sun" /> : <Icon type="moon" />}
                            </button>
                        </div>

                        {/* User Info */}
                        {user.role && (
                            <div className="p-4 border-b border-neutral-300 dark:border-neutral-600">
                                <div className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                    Role: {user.role}
                                </div>
                                {user.proStatus && (
                                    <div className="text-xs text-blue-600 dark:text-blue-300">
                                        Status: {user.proStatus}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Navigation Links */}
                        <nav className="flex-1 p-4 space-y-2">
                            {getNavigationItems().map((item, index) => (
                                <button 
                                    key={index}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded transition-colors"
                                >
                                    <Icon type={item.icon} />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-neutral-300 dark:border-neutral-600 space-y-2">
                            <button 
                                onClick={() => {
                                    navigate('/app/help');
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 p-3 text-left text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                            >
                                <Icon type="help" />
                                <span>Help</span>
                            </button>
                            
                            <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 p-3 text-left text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                            >
                                <Icon type="logout" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default Header;
