import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  createProgram,
  getProgramsByPro,
  getProgramsByAthlete,
  updateProgram,
  getExerciseCategories,
  createExerciseCategory,
  updateExerciseCategory,
  deleteExerciseCategory,
  type ExerciseCategory,
  deleteProgram
} from '../services/programs';
import type { Program, ProgramStatus, Phase } from '../types';
// import type { ProgramTemplate } from '../services/programs';
import { Timestamp } from 'firebase/firestore';
import { getDoc, doc } from 'firebase/firestore';
import { getUsersByRole } from '../services/firebase';
import { db } from '../config/firebase';

const Programs: React.FC = () => {
  const { user } = useAuth();
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [newProgramType, setNewProgramType] = useState('Strength Training');
  const [isBuildingProgram, setIsBuildingProgram] = useState(false);
  // const [selectedTemplate, setSelectedTemplate] = useState('');
  const [rowSelections, setRowSelections] = useState<{[key: string]: {category: string, exercise: string, sets: string, reps: {[key: number]: string}, weight: {[key: number]: string}}}>({});
  const [currentPhase, setCurrentPhase] = useState(1);
  const [filter, setFilter] = useState<ProgramStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [exerciseCategories, setExerciseCategories] = useState<ExerciseCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'detail' | 'assign' | 'exercise-library' | 'create-assign'>('grid');

  // Enhanced state for new features
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'status' | 'athlete'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCompleted, setShowCompleted] = useState(true);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [showProgress, setShowProgress] = useState(false);

  // Exercise library state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [exerciseLibraryView, setExerciseLibraryView] = useState<'grid' | 'analytics'>('grid');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Athletes are loaded from Firestore
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<{ uid: string; firstName: string; lastName: string; email: string }[]>([]);
  // const [templates, setTemplates] = useState<{ id: string; title: string }[]>([]);

  // Team data for creator information
  const [teamMembers, setTeamMembers] = useState<{ uid: string; firstName?: string; lastName?: string; role: string }[]>([]);
  const [teamInfo, setTeamInfo] = useState<{ 
    teamName?: string; 
    proInfo?: { uid: string; firstName?: string; lastName?: string }; 
    members?: number;
    staffCount?: number;
    athleteCount?: number;
  } | null>(null);

  // Load programs from Firestore
  const loadPrograms = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let programsData: Program[] = [];
      
      if (user.role === 'PRO' || user.role === 'STAFF') {
        const result = await getProgramsByPro(user.proId || user.uid);
        if (result.success && 'programs' in result && result.programs) {
          programsData = result.programs as Program[];
        }
      } else if (user.role === 'ATHLETE') {
        const result = await getProgramsByAthlete(user.uid);
        if (result.success && 'programs' in result && result.programs) {
          programsData = result.programs as Program[];
        }
      }
      
      // Ensure all programs have athleteUids array for backward compatibility
      const normalizedPrograms = programsData.map(program => ({
        ...program,
        athleteUids: program.athleteUids || (program.athleteUid ? [program.athleteUid] : [])
      }));
      
      setPrograms(normalizedPrograms);
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load exercise categories from Firestore on mount
  const loadExerciseCategories = async () => {
    if (!user || (user.role !== 'PRO' && user.role !== 'STAFF')) return;
    try {
      const result = await getExerciseCategories(user.proId || user.uid);
      if (result.success) {
        setExerciseCategories(result.categories || []);
        
        // If no categories exist, create some sample ones
        if (result.categories && result.categories.length === 0) {
          await createSampleCategories();
        }
      } else {
        console.error('Error loading exercise categories:', result.error);
        // Fallback to mock data for development
        setExerciseCategories([
          { id: 'strength', name: 'Strength Training', exercises: ['Bench Press', 'Squats', 'Deadlifts'], createdBy: user.uid, proId: user.proId || user.uid, createdAt: Timestamp.now(), updatedAt: Timestamp.now() },
          { id: 'cardio', name: 'Cardio', exercises: ['Running', 'Cycling', 'Rowing'], createdBy: user.uid, proId: user.proId || user.uid, createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
        ]);
      }
    } catch (error) {
      console.error('Error loading exercise categories:', error);
    }
  };

  // Load athletes for Create/Assign dropdown
  const loadAthletes = async () => {
    if (!user) return;
    
    try {
      const result = await getUsersByRole(user.proId || user.uid, 'ATHLETE');
      if (result.success) {
        setAthletes(result.users || []);
      } else {
        console.error('Error loading athletes:', result.error);
      }
    } catch (error) {
      console.error('Error loading athletes:', error);
    }
  };

  const loadTeamData = async () => {
    if (!user) return;
    
    try {
      // Load team members (staff and athletes)
      const staffResult = await getUsersByRole(user.proId || user.uid, 'STAFF');
      const athleteResult = await getUsersByRole(user.proId || user.uid, 'ATHLETE');
      
      const allMembers = [
        ...(staffResult.success ? staffResult.users || [] : []),
        ...(athleteResult.success ? athleteResult.users || [] : [])
      ];
      
      setTeamMembers(allMembers);
      
      // Load team info including PRO user
      if (user.proId) {
        try {
          const teamDoc = await getDoc(doc(db, 'teams', user.proId));
          if (teamDoc.exists()) {
            const teamData = teamDoc.data();
            
            // Fetch PRO user information
            let proUserInfo = null;
            if (teamData.proId) {
              try {
                const proUserDoc = await getDoc(doc(db, 'users', teamData.proId));
                if (proUserDoc.exists()) {
                  const proUserData = proUserDoc.data();
                  proUserInfo = {
                    uid: proUserData.uid,
                    firstName: proUserData.firstName || '',
                    lastName: proUserData.lastName || ''
                  };
                }
              } catch (error) {
                console.error('Error fetching PRO user data:', error);
              }
            }
            
            setTeamInfo({
              members: allMembers.length,
              proInfo: proUserInfo as { uid: string; firstName?: string; lastName?: string } | undefined,
              staffCount: allMembers.filter(m => m.role === 'STAFF').length,
              athleteCount: allMembers.filter(m => m.role === 'ATHLETE').length
            });
          }
        } catch (error) {
          console.error('Error loading team info:', error);
        }
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  // Load templates from Firestore on mount
  // const loadTemplates = async () => {
  //   if (!user) return;
  //   try {
  //     const proId = user.proId || user.uid;
  //     const res = await getProgramTemplatesByPro(proId);
  //     if (res.success) {
  //       setTemplates((res.templates || []).map((t: ProgramTemplate) => ({ id: t.id, title: t.title })));
  //     }
  //   } catch (e) {
  //     console.error('Error loading templates', e);
  //   }
  // };

  // Create sample exercise categories for testing
  const createSampleCategories = async () => {
    if (!user) return;
    
    try {
      // Create Strength Training category
      const strengthResult = await createExerciseCategory(user.uid, {
        name: 'Strength Training',
        exercises: [],
        createdBy: user.uid,
        proId: user.proId || user.uid
      });
      
      if (strengthResult.success && strengthResult.categoryId) {
        // Add some exercises to Strength Training
        await addExerciseToCategory(strengthResult.categoryId, 'Bench Press');
        await addExerciseToCategory(strengthResult.categoryId, 'Squats');
        await addExerciseToCategory(strengthResult.categoryId, 'Deadlifts');
        await addExerciseToCategory(strengthResult.categoryId, 'Overhead Press');
        await addExerciseToCategory(strengthResult.categoryId, 'Rows');
      }

      // Create Cardio category
      const cardioResult = await createExerciseCategory(user.uid, {
        name: 'Cardio',
        exercises: [],
        createdBy: user.uid,
        proId: user.proId || user.uid
      });
      
      if (cardioResult.success && cardioResult.categoryId) {
        // Add some exercises to Cardio
        await addExerciseToCategory(cardioResult.categoryId, 'Running');
        await addExerciseToCategory(cardioResult.categoryId, 'Cycling');
        await addExerciseToCategory(cardioResult.categoryId, 'Rowing');
        await addExerciseToCategory(cardioResult.categoryId, 'Swimming');
        await addExerciseToCategory(cardioResult.categoryId, 'Jump Rope');
      }

      // Create Flexibility category
      const flexibilityResult = await createExerciseCategory(user.uid, {
        name: 'Flexibility',
        exercises: [],
        createdBy: user.uid,
        proId: user.proId || user.uid
      });
      
      if (flexibilityResult.success && flexibilityResult.categoryId) {
        // Add some exercises to Flexibility
        await addExerciseToCategory(flexibilityResult.categoryId, 'Stretching');
        await addExerciseToCategory(flexibilityResult.categoryId, 'Yoga');
        await addExerciseToCategory(flexibilityResult.categoryId, 'Mobility Work');
        await addExerciseToCategory(flexibilityResult.categoryId, 'Foam Rolling');
      }

      // Reload categories after creating samples
      const reloadResult = await getExerciseCategories(user.proId || user.uid);
      if (reloadResult.success) {
        setExerciseCategories(reloadResult.categories || []);
      }
      
      console.log('Sample exercise categories created successfully!');
    } catch (error) {
      console.error('Error creating sample categories:', error);
    }
  };

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string): string => {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper function to add exercise to category
  const addExerciseToCategory = async (categoryId: string, exerciseName: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    try {
      // Find the current category
      const category = exerciseCategories.find(cat => cat.id === categoryId);
      if (!category) {
        return { success: false, error: 'Category not found' };
      }
      
      // Add exercise if it doesn't already exist
      if (!category.exercises.includes(exerciseName)) {
        const updatedExercises = [...category.exercises, exerciseName];
        const result = await updateExerciseCategory(user.uid, categoryId, {
          exercises: updatedExercises
        });
        return result;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error adding exercise to category:', error);
      return { success: false, error };
    }
  };

  // Helper function to delete exercise from category
  const deleteExerciseFromCategory = async (categoryId: string, exerciseName: string) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    
    try {
      // Find the current category
      const category = exerciseCategories.find(cat => cat.id === categoryId);
      if (!category) {
        return { success: false, error: 'Category not found' };
      }
      
      // Remove exercise
      const updatedExercises = category.exercises.filter(ex => ex !== exerciseName);
      const result = await updateExerciseCategory(user.uid, categoryId, {
        exercises: updatedExercises
      });
      return result;
    } catch (error) {
      console.error('Error deleting exercise from category:', error);
      return { success: false, error };
    }
  };

  const getCreatorInfo = (createdByUid: string) => {
    // First check if it's the current user
    if (createdByUid === user?.uid) {
      return {
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        isCurrentUser: true
      };
    }
    
    // Check if it's a staff member
    const staffMember = teamMembers?.find(m => m.uid === createdByUid && m.role === 'STAFF');
    if (staffMember) {
      return {
        name: `${staffMember.firstName} ${staffMember.lastName}`,
        role: 'STAFF',
        isCurrentUser: false
      };
    }
    
    // Check if it's an athlete
    const athlete = athletes.find(a => a.uid === createdByUid);
    if (athlete) {
      return {
        name: `${athlete.firstName} ${athlete.lastName}`,
        role: 'ATHLETE',
        isCurrentUser: false
      };
    }
    
    // Check if it's the PRO user
    if (teamInfo?.proInfo && teamInfo.proInfo.uid === createdByUid) {
      return {
        name: `${teamInfo.proInfo.firstName} ${teamInfo.proInfo.lastName}`,
        role: 'PRO',
        isCurrentUser: false
      };
    }
    
    // Fallback
    return {
      name: 'Team Member',
      role: 'Unknown',
      isCurrentUser: false
    };
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'PRO':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'STAFF':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ATHLETE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Create new program function
  const handleCreateNewProgram = async () => {
    if (!user || selectedAthletes.length === 0 || !newProgramTitle.trim()) return;
    
    try {
      setIsBuildingProgram(true);
      
      // Create the program with proper structure and athlete connections
      const newProgram = {
        proId: user.proId || user.uid,
        athleteUids: selectedAthletes,
        title: capitalizeWords(newProgramTitle.trim()),
        status: 'draft' as ProgramStatus,
        phases: createMockPhases(),
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: Timestamp.now(),
        lastSharedAt: Timestamp.now()
      };
      
      const result = await createProgram(user.uid, newProgram);
      
      if (result.success) {
        // Reload programs to show the new one
        await loadPrograms();
        setViewMode('grid');
        setSelectedAthletes([]);
        setNewProgramTitle('');
        setIsBuildingProgram(false);
        
        // Show success message with all selected athletes
        const athleteNames = selectedAthletes.map(uid => {
          const athlete = athletes.find(a => a.uid === uid);
          return athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Unknown';
        }).join(', ');
        
        alert(`Program "${newProgram.title}" created successfully for ${athleteNames}!`);
      } else {
        console.error('Error creating program:', result.error);
        alert('Failed to create program. Please try again.');
      }
    } catch (error) {
      console.error('Error creating program:', error);
      alert('Failed to create program. Please try again.');
    } finally {
      setIsBuildingProgram(false);
    }
  };

  // Create program from template (unused)
  // const createProgramFromTemplate = (templateName: string) => { /* removed */ } 

  // Load data when component mounts
  useEffect(() => {
    if (user) {
      loadPrograms();
      loadExerciseCategories();
      loadAthletes();
      loadTeamData();
      // loadTemplates();
    }
  }, [user]);

  // Enhanced filtering and sorting functions
  const getFilteredAndSortedPrograms = () => {
    const filtered = programs.filter(program => {
      // Status filter
      if (filter !== 'all' && program.status !== filter) return false;
      
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = program.title.toLowerCase().includes(query);
        const athleteMatch = program.athleteUids?.some(uid => {
          const athlete = athletes.find(a => a.uid === uid);
          return athlete && (
            athlete.firstName.toLowerCase().includes(query) ||
            athlete.lastName.toLowerCase().includes(query)
          );
        }) || false;
        
        if (!titleMatch && !athleteMatch) return false;
      }
      
      return true;
    });

    // Sort programs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return sortOrder === 'asc' 
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        case 'status':
          return sortOrder === 'asc'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        case 'athlete': {
          const aAthlete = athletes.find(ath => a.athleteUids?.includes(ath.uid));
          const bAthlete = athletes.find(ath => b.athleteUids?.includes(ath.uid));
          const aName = aAthlete ? `${aAthlete.firstName} ${aAthlete.lastName}` : '';
          const bName = bAthlete ? `${bAthlete.firstName} ${bAthlete.lastName}` : '';
          return sortOrder === 'asc'
            ? aName.localeCompare(bName)
            : bName.localeCompare(aName);
        }
        case 'date':
        default: {
          const aDate = a.createdAt?.toDate?.() || new Date(0);
          const bDate = b.createdAt?.toDate?.() || new Date(0);
          return sortOrder === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
        }
      }
    });

    return filtered;
  };

  // Auto-save functionality
  // const autoSaveProgram = async (programId: string, updates: Partial<Program>) => {
  //   if (!autoSave || !user) return;
  //   try {
  //     setIsSaving(true);
  //     const result = await updateProgram(programId, updates);
  //     if (result.success) {
  //       setLastSaved(new Date());
  //       setPrograms(prev => prev.map(p => p.id === programId ? { ...p, ...updates } : p));
  //     }
  //   } catch (error) {
  //     console.error('Auto-save failed:', error);
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  // Progress tracking
  const getProgramProgress = (program: Program) => {
    if (!program.phases) return 0;
    
    let totalExercises = 0;
    let completedExercises = 0;
    
    program.phases.forEach(phase => {
      phase.blocks?.forEach(block => {
        block.exercises?.forEach(exercise => {
          totalExercises++;
          if (exercise.completed) completedExercises++;
        });
      });
    });
    
    return totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
  };

  // Save current as template (unused)
  // const handleSaveCurrentAsTemplate = async () => { /* removed */ } 

  // Assign template (unused)
  // const handleAssignTemplate = async () => { /* removed */ } 

  const createMockPhases = (): [Phase, Phase, Phase, Phase] => {
    const phaseNames = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
    const phases = phaseNames.map((name) => ({
      name,
      blocks: Array.from({ length: 8 }, (_, blockIndex) => ({
        muscleGroup: `Block ${blockIndex + 1}`,
        exercises: Array.from({ length: 6 }, (_, exerciseIndex) => ({
          name: `Exercise ${exerciseIndex + 1}`,
          sets: 3,
          reps: 10,
          load: '0lbs',
          tempo: '2-0-2',
          restSec: 60,
          completed: false
        })),
        notes: `Notes for ${name} Block ${blockIndex + 1}`
      }))
    }));

    // Ensure we return exactly 4 phases
    return [phases[0], phases[1], phases[2], phases[3]];
  };

  const canCreateProgram = user?.role === 'PRO' || user?.role === 'STAFF';
  // const canViewExerciseLibrary = user?.role === 'PRO' || user?.role === 'STAFF';


  // const handleProgramSelect = (program: Program) => {
  //   setSelectedProgram(program);
  //   setViewMode('detail');
  //   setCurrentPhase(1);
  // };

  // const handleExerciseLibrary = () => {
  //   setViewMode('exercise-library');
  // };

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      try {
        const capitalizedCategoryName = capitalizeWords(newCategoryName.trim());
        const result = await createExerciseCategory(user?.uid || '', {
          name: capitalizedCategoryName,
          exercises: [],
          createdBy: user?.uid || '',
          proId: user?.proId || user?.uid || ''
        });
        if (result.success) {
          if (result.category) {
            const { id: _ignore, ...categoryWithoutId } = result.category as ExerciseCategory;
            setExerciseCategories(prev => [
              ...prev,
              { id: result.categoryId as string, ...categoryWithoutId }
            ]);
          }
          setNewCategoryName('');
          setIsAddingCategory(false);
        } else {
          console.error('Error creating category:', result.error);
          alert('Failed to create category. Please try again.');
        }
      } catch (error) {
        console.error('Error creating category:', error);
        alert('Failed to create category. Please try again.');
      }
    }
  };

  const handleAddExercise = async (categoryId: string, exerciseName: string) => {
    if (exerciseName.trim()) {
      try {
        const capitalizedExerciseName = capitalizeWords(exerciseName.trim());
        const result = await addExerciseToCategory(categoryId, capitalizedExerciseName);

        if (result.success) {
          setExerciseCategories(prev => 
            prev.map(cat => 
              cat.id === categoryId 
                ? { ...cat, exercises: [...cat.exercises, capitalizedExerciseName] }
                : cat
            )
          );
        } else {
          console.error('Error adding exercise:', result.error);
          alert('Failed to add exercise. Please try again.');
        }
      } catch (error) {
        console.error('Error adding exercise:', error);
        alert('Failed to add exercise. Please try again.');
      }
    }
  };

  const handleDeleteExercise = async (blockIndex: number, exerciseIndex: number) => {
    if (!selectedProgram || !user) return;
    
    const confirmed = window.confirm('Are you sure you want to delete this exercise? This cannot be undone.');
    if (!confirmed) return;
    
    try {
      const updatedProgram = { ...selectedProgram };
      const currentPhaseData = updatedProgram.phases[currentPhase - 1];
      const block = currentPhaseData.blocks[blockIndex];
      
      // Remove exercise from the block
      block.exercises.splice(exerciseIndex, 1);
      
      // Clean the program data before saving
      const cleanProgram = cleanProgramData(updatedProgram);
      
      // Save to Firestore
      const result = await updateProgram(user.uid, selectedProgram.id || '', {
        phases: cleanProgram.phases
      });
      
      if (result.success) {
        // Update local state
        setSelectedProgram(cleanProgram);
        setPrograms(prev => prev.map(p => 
          p.id === selectedProgram.id ? cleanProgram : p
        ));
        
        // Remove any related row selections
        const rowKey = `${blockIndex}-${exerciseIndex}`;
        setRowSelections(prev => {
          const newSelections = { ...prev };
          delete newSelections[rowKey];
          return newSelections;
        });
        
        alert('Exercise deleted successfully!');
      } else {
        console.error('Error deleting exercise:', result.error);
        alert('Failed to delete exercise. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      alert('Failed to delete exercise. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user?.uid) {
      console.error('Error deleting category: user not authenticated');
      alert('You must be signed in to delete a category.');
      return;
    }
    try {
      const result = await deleteExerciseCategory(user.uid, categoryId);

      if (result.success) {
        // Remove from local state
        setExerciseCategories(prev => prev.filter(cat => cat.id !== categoryId));
        // Reset filter if it was pointing to the deleted category
        setSelectedCategoryFilter(prev => (prev === categoryId ? 'all' : prev));
        // Collapse in expanded set if present
        setExpandedCategories(prev => {
          const next = new Set(prev);
          next.delete(categoryId);
          return next;
        });
      } else {
        console.error('Error deleting category:', result.error);
        alert('Failed to delete category. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
  };

  // const getCompletionPercentage = (program: Program) => {
  //   let total = 0;
  //   let completed = 0;
  //   program.phases.forEach(phase => {
  //     phase.blocks.forEach(block => {
  //       total += block.exercises.length;
  //       completed += block.exercises.filter(ex => !!ex.completed).length;
  //     });
  //   });
  //   return total > 0 ? Math.round((completed / total) * 100) : 0;
  // };

  const handleWorkoutCompletion = async (blockIndex: number, exerciseIndex: number, completed: boolean) => {
    if (!selectedProgram || !user) return;
    try {
      const updatedProgram = { ...selectedProgram };
      const exercise = updatedProgram.phases[currentPhase - 1].blocks[blockIndex].exercises[exerciseIndex];
      exercise.completed = completed;
      const result = await updateProgram(user.uid, selectedProgram.id || '', { phases: updatedProgram.phases });
      if (result.success) {
        setSelectedProgram(updatedProgram);
        setPrograms(prev => prev.map(p => p.id === selectedProgram.id ? updatedProgram : p));
      }
    } catch (error) {
      console.error('Error updating completion:', error);
      alert('Failed to update. Please try again.');
    }
  };

  // Validation function to prevent undefined values
  const validateExerciseData = (exercise: Record<string, unknown>) => {
    const validExercise: Record<string, unknown> = {};
    Object.keys(exercise).forEach(key => {
      if (exercise[key] !== undefined && exercise[key] !== null && exercise[key] !== '') {
        validExercise[key] = exercise[key];
      }
    });
    return validExercise;
  };

  // Helper function to clean program data before saving
  const cleanProgramData = (program: Program) => {
    const cleanPhases = program.phases.map(phase => ({
      ...phase,
      blocks: phase.blocks.map(block => ({
        ...block,
        exercises: block.exercises.map(ex => validateExerciseData(ex))
      }))
    })) as [Phase, Phase, Phase, Phase]; // Type assertion to maintain the 4-phase structure
    
    return {
      ...program,
      phases: cleanPhases
    };
  };



  const handleDeleteProgram = async (programId: string) => {
    if (!user || (user.role !== 'PRO' && user.role !== 'STAFF')) return;
    
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${program.title}"?\n\n` +
      `This action cannot be undone and will remove the program for all athletes.`
    );
    
    if (!confirmed) return;
    
    try {
      const result = await deleteProgram(user.uid, programId);
      
      if (result.success) {
        // Remove from local state
        setPrograms(prev => prev.filter(p => p.id !== programId));
        
        // If this was the selected program, clear it
        if (selectedProgram?.id === programId) {
          setSelectedProgram(null);
          setViewMode('grid');
        }
        
        alert('Program deleted successfully!');
      } else {
        console.error('Error deleting program:', result.error);
        alert('Failed to delete program. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting program:', error);
      alert('Failed to delete program. Please try again.');
    }
  };

  const renderExerciseLibrary = () => {
    // Filter exercises based on search and category
    const getFilteredExercises = () => {
      let filtered = exerciseCategories;
      
      if (searchQuery.trim()) {
        filtered = filtered.filter(category => 
          category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.exercises.some(exercise => 
            exercise.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
      }
      
      if (selectedCategoryFilter !== 'all') {
        filtered = filtered.filter(category => category.id === selectedCategoryFilter);
      }
      
      return filtered;
    };

    const filteredCategories = getFilteredExercises();
    const totalExercises = exerciseCategories.reduce((sum, cat) => sum + cat.exercises.length, 0);
    const totalCategories = exerciseCategories.length;

    return (
      <div className="space-y-6">
        {/* Enhanced Header */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              {/* Back to Programs Button */}
              <button
                onClick={() => setViewMode('grid')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors flex items-center space-x-2"
              >
                <span>←</span>
                <span>Back to Programs</span>
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-ethnocentric">
                  🏋️ Exercise Library
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage your exercise categories and build a comprehensive training database
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setExerciseLibraryView('grid')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  exerciseLibraryView === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setExerciseLibraryView('analytics')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  exerciseLibraryView === 'analytics' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Analytics
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalCategories}</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Categories</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalExercises}</div>
              <div className="text-sm text-green-700 dark:text-green-300">Total Exercises</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(totalExercises / Math.max(totalCategories, 1))}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Avg per Category</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {exerciseCategories.filter(cat => cat.exercises.length > 5).length}
              </div>
              <div className="text-sm text-orange-700 dark:text-orange-300">Large Categories</div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter Bar */}
        {exerciseLibraryView !== 'analytics' && (
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Exercises
                </label>
                <input
                  type="text"
                  placeholder="Search by exercise name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Category
                </label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {exerciseCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.exercises.length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => setIsAddingCategory(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  + New Category
                </button>
                <button
                  onClick={() => createSampleCategories()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  Sample Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Category Form */}
        {isAddingCategory && exerciseLibraryView !== 'analytics' && (
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                Create New Exercise Category
              </h3>
              <button
                onClick={() => setIsAddingCategory(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="Category name (auto-capitalized)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {newCategoryName.trim() && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Will be saved as: <span className="font-medium">{capitalizeWords(newCategoryName.trim())}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                Create Category
              </button>
              <button
                onClick={() => setIsAddingCategory(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Exercise Categories Display */}
        <div className="space-y-4">
          {/* Instructions */}
          {exerciseLibraryView !== 'analytics' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">💡 Pro Tip:</p>
                  <p>Click the <span className="font-mono">↓</span> arrow button or the <span className="font-mono text-blue-600">+X more exercises</span> text on any category card to expand and view all exercises in a smooth dropdown. All exercises are displayed at once for easy viewing. Use Grid View for management and Analytics View for insights.</p>
                </div>
              </div>
            </div>
          )}

          {/* Grid View */}
          {exerciseLibraryView === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <div key={category.id} className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  {/* Category Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-1">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {category.exercises.length} exercises
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedCategories);
                            if (newExpanded.has(category.id)) {
                              newExpanded.delete(category.id);
                            } else {
                              newExpanded.add(category.id);
                            }
                            setExpandedCategories(newExpanded);
                          }}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
                          title={expandedCategories.has(category.id) ? "Collapse exercises" : "View all exercises"}
                        >
                          <svg 
                            className={`w-5 h-5 transition-transform duration-200 ${
                              expandedCategories.has(category.id) ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                          title="Delete Category"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Quick Exercise Preview */}
                    <div className="space-y-2">
                      {category.exercises.slice(0, 3).map((exercise, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <span className="text-sm text-gray-900 dark:text-white truncate">{exercise}</span>
                          <button
                            onClick={(e) => e.preventDefault()}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-xs p-1"
                            title="Delete Exercise (unavailable in this view)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {category.exercises.length > 3 && (
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedCategories);
                            if (newExpanded.has(category.id)) {
                              newExpanded.delete(category.id);
                            } else {
                              newExpanded.add(category.id);
                            }
                            setExpandedCategories(newExpanded);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-center py-1 w-full hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors cursor-pointer"
                          title="Click to view all exercises"
                        >
                          +{category.exercises.length - 3} more exercises
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Exercise List - Dropdown Style */}
                  {expandedCategories.has(category.id) && (
                    <div className="overflow-hidden transition-all duration-300 ease-in-out transform origin-top">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 animate-in slide-in-from-top-2 duration-300">
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            All Exercises ({category.exercises.length})
                          </h4>
                          <div className="w-full h-px bg-blue-200 dark:bg-blue-800 mb-3"></div>
                        </div>
                        <div className="space-y-2">
                          {category.exercises.map((exercise, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-600 rounded">
                              <span className="text-sm text-gray-900 dark:text-white">{exercise}</span>
                                                        <button
                            onClick={() => handleDeleteExerciseFromCategory(category.id, exercise)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-xs p-1"
                            title="Delete Exercise"
                          >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add New Exercise */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="New exercise name"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            handleAddExercise(category.id, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          if (input && input.value.trim()) {
                            handleAddExercise(category.id, input.value);
                            input.value = '';
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}



          {/* Analytics View */}
          {exerciseLibraryView === 'analytics' && (
            <div className="space-y-6">
              {/* Analytics Header */}
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Exercise Library Analytics</h3>
                <p className="text-gray-600 dark:text-gray-400">View insights and statistics about your exercise categories and distribution</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Distribution</h3>
                  <div className="space-y-3">
                    {exerciseCategories.map((category) => {
                      const percentage = Math.round((category.exercises.length / Math.max(totalExercises, 1)) * 100);
                      return (
                        <div key={category.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{category.name}</span>
                            <span className="text-gray-500 dark:text-gray-400">{category.exercises.length} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Exercise Growth */}
                <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exercise Growth</h3>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalExercises}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Exercises</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">{totalCategories}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Categories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {Math.round(totalExercises / Math.max(totalCategories, 1))}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Avg per Category</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏋️</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || selectedCategoryFilter !== 'all' ? 'No exercises found' : 'No exercise categories yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || selectedCategoryFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first exercise category to get started'
              }
            </p>
            {!searchQuery && selectedCategoryFilter === 'all' && (
              <button
                onClick={() => setIsAddingCategory(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Create Your First Category
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSweatSheetDetail = () => {
    if (!selectedProgram) return null;

    const currentPhaseData = selectedProgram.phases[currentPhase - 1];
    
    return (
      <div className="space-y-6">
        {/* Enhanced Header with Program Info */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-ethnocentric">
                {selectedProgram.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Phase {currentPhase} of 4 - {currentPhaseData.name}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Status: <span className="font-medium text-blue-600 dark:text-blue-400">{selectedProgram.status}</span></span>
                <span>Athletes: <span className="font-medium text-green-600 dark:text-green-400">
                  {(() => {
                    const programAthletes = selectedProgram.athleteUids?.map(uid => {
                      const athlete = athletes.find(a => a.uid === uid);
                      return athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Unknown';
                    }) || [];
                    
                    if (programAthletes.length === 0) {
                      return 'No athletes assigned';
                    } else if (programAthletes.length === 1) {
                      return programAthletes[0];
                    } else if (programAthletes.length === 2) {
                      return programAthletes.join(' & ');
                    } else {
                      return `${programAthletes.slice(0, -1).join(', ')} & ${programAthletes[programAthletes.length - 1]}`;
                    }
                  })()}
                </span></span>
                <span>Created by: <span className="font-medium text-purple-600 dark:text-purple-400">
                  {(() => {
                    const creatorInfo = getCreatorInfo(selectedProgram.createdBy);
                    return (
                      <span className="flex items-center space-x-2">
                        <span className={creatorInfo.isCurrentUser ? 'text-blue-600 dark:text-blue-400' : ''}>
                          {creatorInfo.name}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(creatorInfo.role)}`}>
                          {creatorInfo.role}
                        </span>
                        {creatorInfo.isCurrentUser && (
                          <span className="text-blue-600 dark:text-blue-400 text-xs">(You)</span>
                        )}
                      </span>
                    );
                  })()}
                </span></span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setViewMode('grid')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Back to Programs
              </button>
              {(user?.role === 'PRO' || user?.role === 'STAFF') && (
                <button
                  onClick={() => handleDeleteProgram(selectedProgram.id || '')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  🗑️ Delete Program
                </button>
              )}
              {canCreateProgram && (
                <>
                  <button 
                    onClick={() => handleCompletePhase(currentPhase)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    ✅ Complete Phase {currentPhase}
                  </button>
                  <button
                    onClick={() => handleSaveProgram()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    💾 Save Program
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Phase Navigation with Progress */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Phase Progress</h3>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((phase) => {
              const phaseData = selectedProgram.phases[phase - 1];
              const isCompleted = (phaseData as { status?: string })?.status === 'completed';
              const isCurrent = currentPhase === phase;
              const completionRate = getPhaseCompletionRate(phaseData);
              
              return (
                <button
                  key={phase}
                  onClick={() => setCurrentPhase(phase)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : isCompleted
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Phase {phase}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {phaseData.name}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {completionRate}% Complete
                  </div>
                  {isCompleted && (
                    <div className="text-green-600 dark:text-green-400 text-lg mt-1">✅</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Enhanced Workout Builder */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              🏋️ Phase {currentPhase} Workout Builder
            </h3>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Auto-save: <span className="font-medium text-green-600 dark:text-green-400">ON</span>
              </span>
              <button
                onClick={() => handleAddBlockToPhase(currentPhase)}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
              >
                + Add Block
              </button>
            </div>
          </div>

          {/* Workout Blocks Grid */}
          <div className="space-y-6">
            {currentPhaseData.blocks.map((block, blockIndex) => (
              <div key={blockIndex} className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
                {/* Block Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-xl font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                          {block.muscleGroup}
                        </span>
                        <button
                          onClick={() => handleOpenBlockNameEdit(blockIndex, block.muscleGroup)}
                          className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 flex-shrink-0"
                          title="Edit block name"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 px-2">
                      {block.exercises.length} exercise{block.exercises.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteBlock(blockIndex)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {/* Exercise Rows */}
                <div className="space-y-3">
                  {block.exercises.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <div className="text-4xl mb-2">🏋️</div>
                      <p className="text-sm">No exercises in this block yet</p>
                      <p className="text-xs">Add your first exercise below</p>
                    </div>
                  ) : (
                    block.exercises.map((exercise, exerciseIndex) => {
                      const selectedSets = parseInt(rowSelections[`${blockIndex}-${exerciseIndex}`]?.sets as string) || 0;
                      
                      return (
                        <div key={exerciseIndex} className="space-y-3">
                          {/* Exercise Header Row */}
                          <div className="grid grid-cols-7 gap-3 items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            {/* Exercise Selection */}
                            <div className="col-span-2">
                              <select 
                                value={rowSelections[`${blockIndex}-${exerciseIndex}`]?.category || ''}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                                onChange={(e) => handleExerciseSelectionChange(blockIndex, exerciseIndex, 'category', e.target.value)}
                              >
                                <option value="">Select Category...</option>
                                {exerciseCategories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="col-span-2">
                              <select 
                                value={rowSelections[`${blockIndex}-${exerciseIndex}`]?.exercise || ''}
                                disabled={!rowSelections[`${blockIndex}-${exerciseIndex}`]?.category}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                                onChange={(e) => handleExerciseSelectionChange(blockIndex, exerciseIndex, 'exercise', e.target.value)}
                              >
                                <option value="">Select Exercise...</option>
                                {rowSelections[`${blockIndex}-${exerciseIndex}`]?.category && exerciseCategories
                                  .find(cat => cat.id === rowSelections[`${blockIndex}-${exerciseIndex}`]?.category)
                                  ?.exercises.map((exerciseName) => (
                                    <option key={exerciseName} value={exerciseName}>
                                      {exerciseName}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            
                            {/* Sets */}
                            <div>
                              <select 
                                value={rowSelections[`${blockIndex}-${exerciseIndex}`]?.sets || ''}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                                onChange={(e) => handleExerciseSelectionChange(blockIndex, exerciseIndex, 'sets', e.target.value)}
                              >
                                <option value="">Sets</option>
                                {[1,2,3,4,5,6].map(num => (
                                  <option key={num} value={num}>{num}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Completion */}
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={exercise.completed || false}
                                onChange={(e) => handleWorkoutCompletion(blockIndex, exerciseIndex, e.target.checked)}
                              />
                            </div>
                            
                            {/* Delete Exercise Button */}
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => handleDeleteExercise(blockIndex, exerciseIndex)}
                                className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Delete Exercise"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {/* Set Rows - Only show when sets are selected */}
                          {selectedSets > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 px-3">
                                Set Details ({selectedSets} sets)
                              </div>
                              {Array.from({ length: selectedSets }, (_, setIndex) => (
                                <div key={setIndex} className="grid grid-cols-8 gap-3 items-center p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                  {/* Set Number */}
                                  <div className="col-span-1 text-center">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Set {setIndex + 1}
                                    </span>
                                  </div>
                                  
                                  {/* Weight */}
                                  <div className="col-span-2">
                                    <input
                                      type="text"
                                      placeholder="Weight (lbs)"
                                      value={(exercise.setDetails as Record<number, { weight?: string }>)?.[setIndex]?.weight || ''}
                                      onChange={(e) => handleSetWeightChange(blockIndex, exerciseIndex, setIndex, e.target.value)}
                                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                                    />
                                  </div>
                                  
                                  {/* Reps - Now individual per set */}
                                  <div className="col-span-1">
                                    <select
                                      value={(exercise.setDetails as Record<number, { reps?: string }>)?.[setIndex]?.reps || ''}
                                      onChange={(e) => handleSetRepsChange(blockIndex, exerciseIndex, setIndex, e.target.value)}
                                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                                    >
                                      <option value="">Reps</option>
                                      {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30].map(num => (
                                        <option key={num} value={num}>{num}</option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  {/* Rest Time */}
                                  <div className="col-span-1">
                                    <input
                                      type="text"
                                      placeholder="Rest (sec)"
                                      value={(exercise.setDetails as Record<number, { restSec?: string }>)?.[setIndex]?.restSec || ''}
                                      onChange={(e) => handleSetRestChange(blockIndex, exerciseIndex, setIndex, e.target.value)}
                                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                                    />
                                  </div>
                                  
                                  {/* Set Completion */}
                                  <div className="col-span-1 flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      checked={(exercise.setDetails as Record<number, { completed?: boolean }>)?.[setIndex]?.completed || false}
                                      onChange={(e) => handleSetCompletionChange(blockIndex, exerciseIndex, setIndex, e.target.checked)}
                                    />
                                  </div>
                                  
                                  {/* Notes */}
                                  <div className="col-span-2">
                                    <input
                                      type="text"
                                      placeholder="Notes"
                                      value={(exercise.setDetails as Record<number, { notes?: string }>)?.[setIndex]?.notes || ''}
                                      onChange={(e) => handleSetNotesChange(blockIndex, exerciseIndex, setIndex, e.target.value)}
                                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-neutral-700 text-gray-900 dark:text-white text-sm"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  
                  {/* Add Exercise Button - Moved to bottom */}
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => handleAddExerciseToBlock(blockIndex)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Exercise</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Program Actions */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Program Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => handleAutoShareProgram()}
              className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-center"
            >
              <div className="text-2xl mb-2">🚀</div>
              <div className="font-medium text-green-800 dark:text-green-200">Auto-Share</div>
              <div className="text-sm text-green-600 dark:text-green-300">Share when ready</div>
            </button>
            
            <button
              onClick={() => handleShareWithAthlete()}
              className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-center"
            >
              <div className="text-2xl mb-2">📤</div>
              <div className="font-medium text-blue-800 dark:text-blue-200">Share Now</div>
              <div className="text-sm text-blue-600 dark:text-blue-300">Send to athlete</div>
            </button>
            
            <button
              onClick={() => handleSaveProgram()}
              className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-center"
            >
              <div className="text-2xl mb-2">💾</div>
              <div className="font-medium text-purple-800 dark:text-purple-200">Save Program</div>
              <div className="text-sm text-purple-600 dark:text-purple-300">Save changes</div>
            </button>
            
            <button
              onClick={() => handleExportProgram()}
              className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-center"
            >
              <div className="text-2xl mb-2">📁</div>
              <div className="font-medium text-orange-800 dark:text-orange-200">Export</div>
              <div className="text-sm text-orange-600 dark:text-orange-300">Download JSON</div>
            </button>
          </div>
        </div>
        
        {/* Edit Block Name Modal */}
        {renderEditBlockNameModal()}
      </div>
    );
  };

  const renderProgramsGrid = () => {
    const filteredPrograms = getFilteredAndSortedPrograms();
    
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Enhanced Header with Search and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white font-ethnocentric">
              💪 SWEATsheet Programs
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
              Manage and track athlete training programs
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => setViewMode('create-assign')}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm sm:text-base"
            >
              + Create New Program
            </button>
            <button
              onClick={() => setViewMode('exercise-library')}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors text-sm sm:text-base"
            >
              Exercise Library
            </button>
          </div>
        </div>

        {/* Enhanced Search and Filter Bar */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Programs
              </label>
              <input
                type="text"
                placeholder="Search by title, athlete, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status Filter
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as ProgramStatus | 'all')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="all">All Statuses</option>
                <option value="current">Current</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'status' | 'athlete')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="date">Date Created</option>
                <option value="title">Program Title</option>
                <option value="status">Status</option>
                <option value="athlete">Athlete Name</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Additional Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-3 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Show Completed</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showProgress}
                  onChange={(e) => setShowProgress(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Show Progress</span>
              </label>
            </div>
          </div>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredPrograms.map((program) => {
            const progress = getProgramProgress(program);
            
            return (
              <div
                key={program.id}
                className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedProgram(program);
                  setViewMode('detail');
                }}
              >
                {/* Program Header */}
                <div className="p-3 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 flex-1 mr-2">
                      {program.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                      program.status === 'current' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      program.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                    </span>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Athletes: {(() => {
                      const programAthletes = program.athleteUids?.map(uid => {
                        const athlete = athletes.find(a => a.uid === uid);
                        return athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Unknown';
                      }) || [];
                      
                      if (programAthletes.length === 0) {
                        return 'No athletes assigned';
                      } else if (programAthletes.length === 1) {
                        return programAthletes[0];
                      } else if (programAthletes.length === 2) {
                        return programAthletes.join(' & ');
                      } else {
                        return `${programAthletes.slice(0, -1).join(', ')} & ${programAthletes[programAthletes.length - 1]}`;
                      }
                    })()}
                  </p>

                  {/* Creator Information */}
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Created by: {program.createdBy ? (
                      (() => {
                        const creatorInfo = getCreatorInfo(program.createdBy);
                        return (
                          <span className="flex items-center space-x-2">
                            <span className={creatorInfo.isCurrentUser ? 'font-medium text-blue-600 dark:text-blue-400' : ''}>
                              {creatorInfo.name}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(creatorInfo.role)}`}>
                              {creatorInfo.role}
                            </span>
                            {creatorInfo.isCurrentUser && (
                              <span className="text-blue-600 dark:text-blue-400 text-xs">(You)</span>
                            )}
                          </span>
                        );
                      })()
                    ) : 'Unknown'}
                  </p>

                  {/* Progress Bar */}
                  {showProgress && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-gray-50 dark:bg-neutral-700 rounded">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {program.phases?.length || 0}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">Phases</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 dark:bg-neutral-700 rounded">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {program.phases?.reduce((total, phase) => 
                          total + (phase.blocks?.reduce((blockTotal, block) => 
                            blockTotal + (block.exercises?.length || 0), 0) || 0), 0) || 0}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">Exercises</div>
                    </div>
                  </div>
                </div>

                {/* Program Footer */}
                <div className="p-4 bg-gray-50 dark:bg-neutral-700 rounded-b-lg">
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      Created: {program.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </span>
                    <div className="flex items-center space-x-2">
                      {(user?.role === 'PRO' || user?.role === 'STAFF') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProgram(program.id || '');
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                          title="Delete Program"
                        >
                          🗑️
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProgram(program);
                          setViewMode('detail');
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredPrograms.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏋️</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery || filter !== 'all' ? 'No programs found' : 'No programs yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || filter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first training program to get started'
              }
            </p>
            {!searchQuery && filter === 'all' && (
              <button
                onClick={() => setViewMode('create-assign')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Create Your First Program
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCreateAssignProgram = () => {
    const selectedAthleteData = athletes.find(a => a.uid === selectedAthlete);
    
    return (
      <div className="space-y-6">
        {/* Simplified Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-ethnocentric mb-2">
            🏋️ Create New Program
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {selectedAthleteData ? `Building a program for ${selectedAthleteData.firstName} ${selectedAthleteData.lastName}` : 'Select an athlete to get started'}
          </p>
        </div>

        {/* Athlete Selection - Most Important First */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">1. Select Athletes</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Select one or more athletes for this program. You can create the same program for multiple athletes at once.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {athletes.map((athlete) => (
              <button
                key={athlete.uid}
                onClick={() => {
                  setSelectedAthletes(prev => {
                    if (prev.includes(athlete.uid)) {
                      return prev.filter(uid => uid !== athlete.uid);
                    } else {
                      return [...prev, athlete.uid];
                    }
                  });
                }}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedAthletes.includes(athlete.uid)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {athlete.firstName} {athlete.lastName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {athlete.email}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedAthletes.includes(athlete.uid)
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedAthletes.includes(athlete.uid) && '✓'}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {selectedAthletes.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Selected {selectedAthletes.length} athlete{selectedAthletes.length !== 1 ? 's' : ''}: {
                  selectedAthletes.map(uid => {
                    const athlete = athletes.find(a => a.uid === uid);
                    return athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Unknown';
                  }).join(', ')
                }
              </p>
            </div>
          )}
        </div>

        {/* Program Details - Simplified Form */}
        {selectedAthlete && (
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">2. Program Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Program Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Program Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Strength Training Program"
                  value={newProgramTitle}
                  onChange={(e) => setNewProgramTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Program Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Program Type
                </label>
                <select 
                  value={newProgramType}
                  onChange={(e) => setNewProgramType(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Strength Training">💪 Strength Training</option>
                  <option value="Power Development">⚡ Power Development</option>
                  <option value="Endurance">🏃 Endurance</option>
                  <option value="Recovery">🔄 Recovery</option>
                  <option value="Custom">🎯 Custom</option>
                </select>
              </div>
            </div>

            {/* Quick Program Preview */}
            {newProgramTitle && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-3">Program Preview</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">4</div>
                    <div className="text-blue-700 dark:text-blue-300">Phases</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">32</div>
                    <div className="text-blue-700 dark:text-blue-300">Workout Blocks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">192</div>
                    <div className="text-blue-700 dark:text-blue-300">Total Exercises</div>
                  </div>
                </div>
                <div className="mt-3 text-center text-xs text-blue-600 dark:text-blue-400">
                  Estimated Duration: 8-12 weeks
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Button - Prominent Action */}
        {selectedAthlete && (
          <div className="text-center">
            <button 
              onClick={handleCreateNewProgram}
              disabled={!newProgramTitle.trim() || isBuildingProgram}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isBuildingProgram ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creating Program...</span>
                </div>
              ) : (
                '🚀 Create Program Now'
              )}
            </button>
            
            {/* Validation Messages */}
            {!newProgramTitle.trim() && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-3">
                ⚠️ Please enter a program title to continue
              </p>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button 
              onClick={() => setViewMode('exercise-library')}
              className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-center"
            >
              <div className="text-2xl mb-2">📚</div>
              <div className="font-medium text-purple-800 dark:text-purple-200">Exercise Library</div>
              <div className="text-sm text-purple-600 dark:text-purple-300">Manage exercises</div>
            </button>
            
            <button 
              onClick={() => setViewMode('grid')}
              className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-center"
            >
              <div className="text-2xl mb-2">📋</div>
              <div className="font-medium text-green-800 dark:text-green-200">View Programs</div>
              <div className="text-sm text-green-600 dark:text-green-300">See all programs</div>
            </button>
            
            <button 
              onClick={() => {
                setViewMode('grid');
                setSelectedAthlete(null);
              }}
              className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors text-center"
            >
              <div className="text-2xl mb-2">←</div>
              <div className="font-medium text-gray-800 dark:text-gray-200">Back to Programs</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Return to main view</div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced workout building and phasing functions
  const getPhaseCompletionRate = (phase: Phase) => {
    if (!phase || !phase.blocks) return 0;
    
    let totalExercises = 0;
    let completedExercises = 0;
    
    phase.blocks.forEach((block) => {
      if (block.exercises) {
        totalExercises += block.exercises.length;
        block.exercises.forEach((exercise) => {
          if (exercise.completed) completedExercises++;
        });
      }
    });
    
    return totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
  };

  const handleExerciseSelectionChange = (blockIndex: number, exerciseIndex: number, field: string, value: string | number) => {
    if (!selectedProgram || !user) return;
    
    const rowKey = `${blockIndex}-${exerciseIndex}`;
    setRowSelections(prev => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        [field]: value
      }
    }));
  };

  const handleAddBlockToPhase = (phaseNumber: number) => {
    if (!selectedProgram) return;
    
    const updatedProgram = { ...selectedProgram };
    const phase = updatedProgram.phases[phaseNumber - 1];
    
    // Add new block to the phase
    phase.blocks.push({
      muscleGroup: 'New Muscle Group',
      exercises: [],
      notes: ''
    });
    
    // Update program
    setSelectedProgram(updatedProgram);
  };

  const handleAddExerciseToBlock = (blockIndex: number) => {
    if (!selectedProgram) return;
    
    const updatedProgram = { ...selectedProgram };
    const currentPhaseData = updatedProgram.phases[currentPhase - 1];
    const block = currentPhaseData.blocks[blockIndex];
    
    // Add new exercise to the block
    block.exercises.push({
      name: 'New Exercise',
      sets: 3,
      reps: 10, // Default value to satisfy interface requirement
      load: '',
      tempo: '',
      restSec: 60,
      category: '',
      completed: false
    });
    
    // Update program
    setSelectedProgram(updatedProgram);
  };

  const handleDeleteBlock = (blockIndex: number) => {
    if (!selectedProgram) return;
    
    const block = selectedProgram.phases[currentPhase - 1].blocks[blockIndex];
    const exerciseCount = block.exercises.length;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${block.muscleGroup}" block?\n\n` +
      `This will remove ${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''} and cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const updatedProgram = { ...selectedProgram };
      const currentPhaseData = updatedProgram.phases[currentPhase - 1];
      
      // Remove block
      currentPhaseData.blocks.splice(blockIndex, 1);
      
      // Clean the program data before saving
      const cleanProgram = cleanProgramData(updatedProgram);
      
      // Update program
      setSelectedProgram(cleanProgram);
      
      alert(`Block "${block.muscleGroup}" deleted successfully!`);
    } catch (error) {
      console.error('Error deleting block:', error);
      alert('Failed to delete block. Please try again.');
    }
  };

  const handleCompletePhase = async (phaseNumber: number) => {
    if (!selectedProgram || !user) return;
    
    try {
      const updatedProgram = { ...selectedProgram };
      const phase = updatedProgram.phases[phaseNumber - 1];
      
      // Mark phase as completed (add custom property)
      (phase as Phase & { status?: string; completedAt?: Date }).status = 'completed';
      (phase as Phase & { status?: string; completedAt?: Date }).completedAt = new Date();
      
      // Update program
      setSelectedProgram(updatedProgram);
      
      // Save to Firestore
      const result = await updateProgram(user!.uid, selectedProgram.id || '', {
        phases: updatedProgram.phases,
        updatedAt: Timestamp.now()
      });
      
      if (result.success) {
        // Update programs list
        setPrograms(prev => prev.map(p => 
          p.id === selectedProgram.id ? updatedProgram : p
        ));
        
        // Show success message
        alert(`Phase ${phaseNumber} marked as completed!`);
        
        // Move to next phase if available
        if (phaseNumber < 4) {
          setCurrentPhase(phaseNumber + 1);
        }
      } else {
        console.error('Error completing phase:', result.error);
        alert('Failed to complete phase. Please try again.');
      }
    } catch (error) {
      console.error('Error completing phase:', error);
      alert('Failed to complete phase. Please try again.');
    }
  };

  const handleSaveProgram = async () => {
    if (!selectedProgram) return;
    
    try {
      // Clean the program data before saving
      const cleanProgram = cleanProgramData(selectedProgram);
      
      const result = await updateProgram(user!.uid, selectedProgram.id || '', {
        phases: cleanProgram.phases,
        updatedAt: Timestamp.now()
      });
      
      if (result.success) {
        // Update local state with cleaned data
        setSelectedProgram(cleanProgram);
        
        // Update programs list
        setPrograms(prev => prev.map(p => 
          p.id === selectedProgram.id ? cleanProgram : p
        ));
        
        // Show success message
        alert('Program saved successfully!');
      } else {
        console.error('Error saving program:', result.error);
        alert('Failed to save program. Please try again.');
      }
    } catch (error) {
      console.error('Error saving program:', error);
      alert('Failed to save program. Please try again.');
    }
  };

  const handleShareWithAthlete = async () => {
    if (!selectedProgram || !user) return;
    
    try {
      // Share with all athletes assigned to the program
      const athleteUids = selectedProgram.athleteUids || [];
      
      for (const athleteUid of athleteUids) {
        await notifyAthleteOfNewProgram(athleteUid, selectedProgram.title);
      }
      
      // Update last shared timestamp
      await updateProgram(user!.uid, selectedProgram.id || '', {
        updatedAt: Timestamp.now()
      });
      
      const athleteNames = athleteUids.map(uid => {
        const athlete = athletes.find(a => a.uid === uid);
        return athlete ? `${athlete.firstName} ${athlete.lastName}` : 'Unknown';
      }).join(', ');
      
      alert(`Program shared successfully with ${athleteNames}! All athletes have been notified.`);
    } catch (error) {
      console.error('Error sharing program:', error);
      alert('Failed to share program. Please try again.');
    }
  };

  // Notify athlete of new program (placeholder for notification system)
  const notifyAthleteOfNewProgram = async (athleteUid: string, programTitle: string) => {
    try {
      // This would integrate with your notification system
      // For now, we'll just log it
      console.log(`Notifying athlete ${athleteUid} about new program: ${programTitle}`);
      
      // You could add a notification to Firestore here
      // await addNotification({
      //   userId: athleteUid,
      //   type: 'new_program',
      //   title: 'New Training Program Available',
      //   message: `Your coach has created a new program: ${programTitle}`,
      //   data: { programId: selectedProgram?.id },
      //   read: false,
      //   createdAt: new Date()
      // });
      
    } catch (error) {
      console.error('Error notifying athlete:', error);
    }
  };

  // Auto-share program when it's ready
  const handleAutoShareProgram = async () => {
    if (!selectedProgram) return;
    
    try {
      // Check if program is complete enough to share
      const totalExercises = selectedProgram.phases.reduce((total, phase) => 
        total + phase.blocks.reduce((blockTotal, block) => 
          blockTotal + block.exercises.length, 0
        ), 0
      );
      
      if (totalExercises < 5) {
        alert('Please add at least 5 exercises before sharing the program with your athlete.');
        return;
      }
      
      // Share the program
      await handleShareWithAthlete();
      
    } catch (error) {
      console.error('Error auto-sharing program:', error);
      alert('Failed to auto-share program. Please try again.');
    }
  };

  const handleExportProgram = () => {
    if (!selectedProgram) return;
    
    // Create program summary for export
    const programData = {
      title: selectedProgram.title,
      athlete: athletes.find(a => a.uid === selectedProgram.athleteUid)?.firstName + ' ' + athletes.find(a => a.uid === selectedProgram.athleteUid)?.lastName,
      status: selectedProgram.status,
      phases: selectedProgram.phases.map((phase, index) => ({
        phaseNumber: index + 1,
        name: phase.name,
        status: (phase as Phase & { status?: string }).status || 'in-progress',
        blocks: phase.blocks.map((block, blockIndex) => ({
          blockNumber: blockIndex + 1,
          muscleGroup: block.muscleGroup,
          exercises: block.exercises.map((exercise, exerciseIndex) => ({
            exerciseNumber: exerciseIndex + 1,
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            load: exercise.load,
            completed: exercise.completed
          }))
        }))
      }))
    };
    
    // Convert to JSON and download
    const dataStr = JSON.stringify(programData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedProgram.title.replace(/\s+/g, '_')}_Program.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    alert('Program exported successfully!');
  };

  const handleSetWeightChange = (blockIndex: number, exerciseIndex: number, setIndex: number, weight: string) => {
    if (!selectedProgram) return;
    
    const updatedProgram = { ...selectedProgram };
    const currentPhaseData = updatedProgram.phases[currentPhase - 1];
    const block = currentPhaseData.blocks[blockIndex];
    const exercise = block.exercises[exerciseIndex];
    
    // Initialize setDetails array if it doesn't exist
    if (!exercise.setDetails) {
      exercise.setDetails = [];
    }
    
    // Initialize the specific set if it doesn't exist
    if (!exercise.setDetails[setIndex]) {
      exercise.setDetails[setIndex] = {};
    }
    
    // Update the weight
    exercise.setDetails[setIndex].weight = weight;
    
    // Clean and save
    const cleanProgram = cleanProgramData(updatedProgram);
    setSelectedProgram(cleanProgram);
  };

  const handleSetRestChange = (blockIndex: number, exerciseIndex: number, setIndex: number, restSec: string) => {
    if (!selectedProgram) return;
    
    const updatedProgram = { ...selectedProgram };
    const currentPhaseData = updatedProgram.phases[currentPhase - 1];
    const block = currentPhaseData.blocks[blockIndex];
    const exercise = block.exercises[exerciseIndex];
    
    // Initialize setDetails array if it doesn't exist
    if (!exercise.setDetails) {
      exercise.setDetails = [];
    }
    
    // Initialize the specific set if it doesn't exist
    if (!exercise.setDetails[setIndex]) {
      exercise.setDetails[setIndex] = {};
    }
    
    // Update the rest time
    exercise.setDetails[setIndex].restSec = parseInt(restSec) || 0;
    
    // Clean and save
    const cleanProgram = cleanProgramData(updatedProgram);
    setSelectedProgram(cleanProgram);
  };

  const handleSetCompletionChange = (blockIndex: number, exerciseIndex: number, setIndex: number, completed: boolean) => {
    if (!selectedProgram) return;
    
    const updatedProgram = { ...selectedProgram };
    const currentPhaseData = updatedProgram.phases[currentPhase - 1];
    const block = currentPhaseData.blocks[blockIndex];
    const exercise = block.exercises[exerciseIndex];
    
    // Initialize setDetails array if it doesn't exist
    if (!exercise.setDetails) {
      exercise.setDetails = [];
    }
    
    // Initialize the specific set if it doesn't exist
    if (!exercise.setDetails[setIndex]) {
      exercise.setDetails[setIndex] = {};
    }
    
    // Update the completion status
    exercise.setDetails[setIndex].completed = completed;
    
    // Clean and save
    const cleanProgram = cleanProgramData(updatedProgram);
    setSelectedProgram(cleanProgram);
  };

  const handleSetNotesChange = (blockIndex: number, exerciseIndex: number, setIndex: number, notes: string) => {
    if (!selectedProgram) return;
    
    const updatedProgram = { ...selectedProgram };
    const currentPhaseData = updatedProgram.phases[currentPhase - 1];
    const block = currentPhaseData.blocks[blockIndex];
    const exercise = block.exercises[exerciseIndex];
    
    // Initialize setDetails array if it doesn't exist
    if (!exercise.setDetails) {
      exercise.setDetails = [];
    }
    
    // Initialize the specific set if it doesn't exist
    if (!exercise.setDetails[setIndex]) {
      exercise.setDetails[setIndex] = {};
    }
    
    // Update the notes
    exercise.setDetails[setIndex].notes = notes;
    
    // Clean and save
    const cleanProgram = cleanProgramData(updatedProgram);
    setSelectedProgram(cleanProgram);
  };

  const handleSetRepsChange = (blockIndex: number, exerciseIndex: number, setIndex: number, reps: string) => {
    if (!selectedProgram) return;
    
    const updatedProgram = { ...selectedProgram };
    const currentPhaseData = updatedProgram.phases[currentPhase - 1];
    const block = currentPhaseData.blocks[blockIndex];
    const exercise = block.exercises[exerciseIndex];
    
    // Initialize setDetails array if it doesn't exist
    if (!exercise.setDetails) {
      exercise.setDetails = [];
    }
    
    // Initialize the specific set if it doesn't exist
    if (!exercise.setDetails[setIndex]) {
      exercise.setDetails[setIndex] = {};
    }
    
    // Update the reps
    exercise.setDetails[setIndex].reps = parseInt(reps) || 0;
    
    // Clean and save
    const cleanProgram = cleanProgramData(updatedProgram);
    setSelectedProgram(cleanProgram);
  };

  const handleBlockNameChange = (blockIndex: number, newName: string) => {
    if (!selectedProgram) return;
    
    const updatedProgram = { ...selectedProgram };
    const currentPhaseData = updatedProgram.phases[currentPhase - 1];
    const block = currentPhaseData.blocks[blockIndex];
    
    // Update the block name
    block.muscleGroup = newName;
    
    // Clean and save
    const cleanProgram = cleanProgramData(updatedProgram);
    setSelectedProgram(cleanProgram);
  };

  const [editingBlockName, setEditingBlockName] = useState<{ blockIndex: number; currentName: string } | null>(null);
  const [editingBlockNameInput, setEditingBlockNameInput] = useState('');

  const handleOpenBlockNameEdit = (blockIndex: number, currentName: string) => {
    setEditingBlockName({ blockIndex, currentName });
    setEditingBlockNameInput(currentName);
  };

  const handleCloseBlockNameEdit = () => {
    setEditingBlockName(null);
    setEditingBlockNameInput('');
  };

  const handleSaveBlockNameEdit = () => {
    if (editingBlockName && editingBlockNameInput.trim()) {
      handleBlockNameChange(editingBlockName.blockIndex, editingBlockNameInput.trim());
      handleCloseBlockNameEdit();
    }
  };

  // Edit Block Name Popup Modal
  const renderEditBlockNameModal = () => {
    if (!editingBlockName) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Block Name
            </h3>
            <button
              onClick={handleCloseBlockNameEdit}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Block Name
            </label>
            <input
              type="text"
              value={editingBlockNameInput}
              onChange={(e) => setEditingBlockNameInput(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter block name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveBlockNameEdit();
                } else if (e.key === 'Escape') {
                  handleCloseBlockNameEdit();
                }
              }}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCloseBlockNameEdit}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBlockNameEdit}
              disabled={!editingBlockNameInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleDeleteExerciseFromCategory = async (categoryId: string, exerciseName: string) => {
    try {
      const res = await deleteExerciseFromCategory(categoryId, exerciseName);
      if (res.success) {
        setExerciseCategories(prev => prev.map(cat =>
          cat.id === categoryId ? { ...cat, exercises: cat.exercises.filter(e => e !== exerciseName) } : cat
        ));
      } else {
        console.error('Failed to delete exercise from category', res.error);
        alert('Failed to delete exercise from category');
      }
    } catch (e) {
      console.error('Delete exercise error', e);
      alert('Failed to delete exercise from category');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your SweatSheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {viewMode === 'grid' && renderProgramsGrid()}
      {viewMode === 'detail' && renderSweatSheetDetail()}
      {viewMode === 'create-assign' && renderCreateAssignProgram()}
      {viewMode === 'exercise-library' && renderExerciseLibrary()}
      {renderEditBlockNameModal()}
    </div>
  );
};

export default Programs; 