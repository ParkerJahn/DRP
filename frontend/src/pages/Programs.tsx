import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  createProgram,
  getProgramsByPro,
  getProgramsByAthlete,
  updateProgram,
  getExerciseCategories,
  createExerciseCategory,
  addExerciseToCategory,
  deleteExerciseFromCategory,
  deleteExerciseCategory,
  type ExerciseCategory,
  deleteProgram
} from '../services/programs';
import type { Program, ProgramStatus, Phase } from '../types';

const Programs: React.FC = () => {
  const { user } = useAuth();
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [newProgramType, setNewProgramType] = useState('Strength Training');
  const [newProgramPhases, setNewProgramPhases] = useState(4);
  const [isBuildingProgram, setIsBuildingProgram] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customizationNotes, setCustomizationNotes] = useState('');
  const [isAssigningProgram, setIsAssigningProgram] = useState(false);
  const [rowSelections, setRowSelections] = useState<{[key: string]: {category: string, exercise: string, sets: string, reps: {[key: number]: string}, weight: {[key: number]: string}}}>({});
  const [currentPhase, setCurrentPhase] = useState(1);
  const [filter, setFilter] = useState<ProgramStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [exerciseCategories, setExerciseCategories] = useState<ExerciseCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'detail' | 'assign' | 'exercise-library' | 'create-assign'>('grid');

  // Athletes are loaded from Firestore
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<{ uid: string; firstName: string; lastName: string; email: string }[]>([]);

  // Load programs from Firestore
  const loadPrograms = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let result;
      
      if (user.role === 'ATHLETE') {
        result = await getProgramsByAthlete(user.uid);
      } else {
        result = await getProgramsByPro(user.proId || user.uid);
      }
      
      if (result.success) {
        setPrograms(result.programs || []);
      } else {
        console.error('Error loading programs:', result.error);
        // Fallback to mock data for development
        setPrograms(createMockPrograms());
      }
    } catch (error) {
      console.error('Error loading programs:', error);
      // Fallback to mock data for development
      setPrograms(createMockPrograms());
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
          { id: 'strength', name: 'Strength Training', exercises: ['Bench Press', 'Squats', 'Deadlifts'], createdBy: user.uid, proId: user.proId || user.uid, createdAt: new Date() as any, updatedAt: new Date() as any },
          { id: 'cardio', name: 'Cardio', exercises: ['Running', 'Cycling', 'Rowing'], createdBy: user.uid, proId: user.proId || user.uid, createdAt: new Date() as any, updatedAt: new Date() as any }
        ]);
      }
    } catch (error) {
      console.error('Error loading exercise categories:', error);
    }
  };

  // Load athletes for Create/Assign dropdown
  const loadAthletes = async () => {
    if (!user) return;
    const proId = user.proId || user.uid;
    try {
      const { getUsersByRole } = await import('../services/firebase');
      const res = await getUsersByRole(proId, 'ATHLETE');
      if (res.success && Array.isArray(res.users)) {
        setAthletes(res.users.map((u) => ({
          uid: u.uid,
          firstName: (u as any)?.firstName || u.displayName || 'Athlete',
          lastName: (u as any)?.lastName || '',
          email: u.email,
        })));
      }
    } catch (e) {
      console.error('Error loading athletes:', e);
    }
  };

  // Create sample exercise categories for testing
  const createSampleCategories = async () => {
    if (!user) return;
    
    try {
      // Create Strength Training category
      const strengthResult = await createExerciseCategory({
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
      const cardioResult = await createExerciseCategory({
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
      const flexibilityResult = await createExerciseCategory({
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
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Create new program function
  const handleCreateNewProgram = async () => {
    if (!user || !selectedAthlete || !newProgramTitle.trim()) return;
    
    try {
      setIsBuildingProgram(true);
      
      // Create the program with the specified number of phases
      const newProgram = {
        proId: user.proId || user.uid,
        athleteUid: selectedAthlete,
        title: capitalizeWords(newProgramTitle.trim()),
        status: 'draft' as ProgramStatus,
        phases: createMockPhases(),
        createdBy: user.uid,
      };
      
      const result = await createProgram(newProgram);
      
      if (result.success) {
        // Reload programs to show the new one
        await loadPrograms();
        setViewMode('grid');
        setSelectedAthlete(null);
        setNewProgramTitle('');
        setIsBuildingProgram(false);
        
        // Show success message
        alert('Program created successfully!');
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

  // Assign existing program function
  const handleAssignExistingProgram = async () => {
    if (!user || !selectedAthlete) {
      alert('Please select an athlete first.');
      return;
    }
    
    if (!selectedTemplate) {
      alert('Please select a program template.');
      return;
    }
    
    try {
      setIsAssigningProgram(true);
      
      // Create program from template
      const templateProgram = createProgramFromTemplate(selectedTemplate);
      const newProgram = {
        ...templateProgram,
        proId: user.proId || user.uid,
        athleteUid: selectedAthlete,
        createdBy: user.uid,
        customizationNotes: customizationNotes.trim() || undefined,
      };
      
      const result = await createProgram(newProgram);
      
      if (result.success) {
        // Reload programs to show the new one
        await loadPrograms();
        setViewMode('grid');
        setSelectedAthlete(null);
        setSelectedTemplate('');
        setCustomizationNotes('');
        setIsAssigningProgram(false);
        
        // Show success message
        alert(`Program "${templateProgram.title}" assigned successfully to ${athletes.find(a => a.uid === selectedAthlete)?.firstName || 'athlete'}!`);
      } else {
        console.error('Error assigning program:', result.error);
        alert('Failed to assign program. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning program:', error);
      alert('Failed to assign program. Please try again.');
    } finally {
      setIsAssigningProgram(false);
    }
  };

  // Create program from template
  const createProgramFromTemplate = (templateName: string) => {
    const templates = {
      'Strength Training Program': {
        title: 'Strength Training Program',
        status: 'draft' as ProgramStatus,
        phases: createMockPhases(),
        description: 'Focus on building maximum strength with compound movements and progressive overload',
        focus: 'Compound lifts, progressive overload, strength building',
        difficulty: 'Intermediate to Advanced',
      },
      'Power Development Program': {
        title: 'Power Development Program',
        status: 'draft' as ProgramStatus,
        phases: createMockPhases(),
        description: 'Explosive movements and Olympic lifts to develop power and athletic performance',
        focus: 'Olympic lifts, plyometrics, explosive movements',
        difficulty: 'Advanced',
      },
      'Endurance Program': {
        title: 'Endurance Program',
        status: 'draft' as ProgramStatus,
        phases: createMockPhases(),
        description: 'High-rep training and cardio integration for muscular and cardiovascular endurance',
        focus: 'High reps, circuit training, cardio integration',
        difficulty: 'Beginner to Intermediate',
      },
      'Recovery Program': {
        title: 'Recovery Program',
        status: 'draft' as ProgramStatus,
        phases: createMockPhases(),
        description: 'Light training and mobility work to maintain fitness while promoting recovery',
        focus: 'Mobility, flexibility, light resistance, recovery',
        difficulty: 'All Levels',
      },
    };
    
    return templates[templateName as keyof typeof templates] || templates['Strength Training Program'];
  };

  // Load data when component mounts
  useEffect(() => {
    if (user) {
      loadPrograms();
      loadExerciseCategories();
      loadAthletes();
    }
  }, [user]);

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

  const createMockPrograms = (): Program[] => {
    return [
      {
        proId: user?.proId || '',
        athleteUid: 'athlete1',
        title: 'Strength Training Program',
        status: 'current',
        phases: createMockPhases(),
        createdBy: user?.uid || '',
        createdAt: { toDate: () => new Date() } as any,
        updatedAt: { toDate: () => new Date() } as any
      },
      {
        proId: user?.proId || '',
        athleteUid: 'athlete2',
        title: 'Power Development Program',
        status: 'current',
        phases: createMockPhases(),
        createdBy: user?.uid || '',
        createdAt: { toDate: () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } as any,
        updatedAt: { toDate: () => new Date() } as any
      }
    ];
  };

  const canCreateProgram = user?.role === 'PRO' || user?.role === 'STAFF';
  const canViewExerciseLibrary = user?.role === 'PRO' || user?.role === 'STAFF';


  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
    setViewMode('detail');
    setCurrentPhase(1);
  };

  const handleExerciseLibrary = () => {
    setViewMode('exercise-library');
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim() && newCategoryId.trim()) {
      try {
        const capitalizedCategoryName = capitalizeWords(newCategoryName.trim());
        const result = await createExerciseCategory({
          name: capitalizedCategoryName,
          exercises: [],
          createdBy: user?.uid || '',
          proId: user?.proId || user?.uid || ''
        });
        if (result.success) {
          if (result.category) {
            setExerciseCategories(prev => [...prev, result.category]);
          }
          setNewCategoryName('');
          setNewCategoryId('');
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

  const handleDeleteExercise = async (categoryId: string, exerciseName: string) => {
    try {
      const result = await deleteExerciseFromCategory(categoryId, exerciseName);

      if (result.success) {
        setExerciseCategories(prev => 
          prev.map(cat => 
            cat.id === categoryId 
              ? { ...cat, exercises: cat.exercises.filter((ex: string) => ex !== exerciseName) }
              : cat
          )
        );
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
    try {
      const result = await deleteExerciseCategory(categoryId);

      if (result.success) {
        setExerciseCategories(prev => 
          prev.filter(cat => cat.id !== categoryId)
        );
      } else {
        console.error('Error deleting category:', result.error);
        alert('Failed to delete category. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
  };

  const getCompletionPercentage = (program: Program) => {
    const totalExercises = program.phases.reduce((total, phase) => 
      total + phase.blocks.reduce((blockTotal, block) => 
        blockTotal + block.exercises.length, 0), 0);
    
    const completedExercises = program.phases.reduce((total, phase) => 
      total + phase.blocks.reduce((blockTotal, block) => 
        blockTotal + block.exercises.filter(ex => (ex as any).completed).length, 0), 0);
    
    return totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
  };

  const handleWorkoutCompletion = async (blockIndex: number, exerciseIndex: number, completed: boolean) => {
    if (!selectedProgram) return;
    
    try {
      // Update local state immediately for UI responsiveness
      const updatedProgram = { ...selectedProgram };
      const exercise = updatedProgram.phases[currentPhase - 1].blocks[blockIndex].exercises[exerciseIndex];
      (exercise as any).completed = completed;
      
      // Update the program in Firestore
      const result = await updateProgram(selectedProgram.id || '', {
        phases: updatedProgram.phases
      });
      
      if (result.success) {
        // Update local state
        setSelectedProgram(updatedProgram);
        // Update programs list
        setPrograms(prev => prev.map(p => 
          p.athleteUid === selectedProgram.athleteUid ? updatedProgram : p
        ));
      } else {
        console.error('Error updating workout completion:', result.error);
        // Revert local state on error
        setSelectedProgram(selectedProgram);
      }
    } catch (error) {
      console.error('Error updating workout completion:', error);
      // Revert local state on error
      setSelectedProgram(selectedProgram);
    }
  };

  const saveExerciseSelections = async (blockIndex: number, exerciseIndex: number) => {
    if (!selectedProgram) return;
    
    try {
      const rowKey = `${blockIndex}-${exerciseIndex}`;
      const selections = rowSelections[rowKey];
      
      if (!selections) return;
      
      // Update local state immediately for UI responsiveness
      const updatedProgram = { ...selectedProgram };
      const exercise = updatedProgram.phases[currentPhase - 1].blocks[blockIndex].exercises[exerciseIndex];
      
      // Update exercise with selections
      (exercise as any).category = selections.category;
      (exercise as any).exerciseName = selections.exercise;
      (exercise as any).sets = selections.sets;
      (exercise as any).reps = selections.reps;
      (exercise as any).weight = selections.weight;
      
      // Update the program in Firestore
      const result = await updateProgram(selectedProgram.id || '', {
        phases: updatedProgram.phases
      });
      
      if (result.success) {
        // Update local state
        setSelectedProgram(updatedProgram);
        // Update programs list
        setPrograms(prev => prev.map(p => 
          p.athleteUid === selectedProgram.athleteUid ? updatedProgram : p
        ));
      } else {
        console.error('Error updating exercise selections:', result.error);
        // Revert local state on error
        setSelectedProgram(selectedProgram);
      }
    } catch (error) {
      console.error('Error updating exercise selections:', error);
      // Revert local state on error
      setSelectedProgram(selectedProgram);
    }
  };

  const handleDeleteProgram = async (program: Program, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!program.id) {
      alert('Unable to delete: missing program id.');
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to delete "${program.title}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      const res = await deleteProgram(program.id);
      if (res.success) {
        setPrograms(prev => prev.filter(p => p.id !== program.id));
        if (selectedProgram?.id === program.id) {
          setSelectedProgram(null);
        }
      } else {
        console.error('Error deleting program:', (res as any).error);
        alert('Failed to delete program. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting program:', err);
      alert('Failed to delete program. Please try again.');
    }
  };

  const renderExerciseLibrary = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold dark:text-white">Exercise Library</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            Back to Programs
          </button>
          <button
            onClick={() => setIsAddingCategory(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            New Category
          </button>
          <button
            onClick={createSampleCategories}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Create Sample Data
          </button>
        </div>
      </div>

      {/* Add New Category Form */}
      {isAddingCategory && (
        <div className="bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400">Create New Exercise Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category Name
              </label>
              <input
                type="text"
                placeholder="Category name (auto-capitalized)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {newCategoryName.trim() && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Will be saved as: <span className="font-medium">{capitalizeWords(newCategoryName.trim())}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category ID (optional)
              </label>
              <input
                type="text"
                placeholder="Category ID (lowercase)"
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value.toLowerCase())}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Create Category
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {exerciseCategories.map((category) => (
          <div key={category.id} className="bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">{category.name}</h3>
              <button
                onClick={() => handleDeleteCategory(category.id)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm p-1"
                title="Delete Category"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {category.exercises.map((exercise, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-gray-900 dark:text-white">{exercise}</span>
                  <button
                    onClick={() => handleDeleteExercise(category.id, exercise)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                    title="Delete Exercise"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="New exercise name (auto-capitalized)"
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSweatSheetDetail = () => {
    if (!selectedProgram) return null;

    const currentPhaseData = selectedProgram.phases[currentPhase - 1];
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{selectedProgram.title}</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Phase {currentPhase} of 4 - {currentPhaseData.name}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setViewMode('grid')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Programs
            </button>
            {canCreateProgram && (
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Complete Phase
              </button>
            )}
          </div>
        </div>

        {/* Phase Navigation */}
        <div className="flex space-x-2">
          {[1, 2, 3, 4].map((phase) => (
            <button
              key={phase}
              onClick={() => setCurrentPhase(phase)}
              className={`px-4 py-2 rounded-lg ${
                currentPhase === phase
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Phase {phase}
            </button>
          ))}
        </div>

        {/* SweatSheet Blocks Grid */}
        <div className="grid grid-cols-1 gap-2">
          {currentPhaseData.blocks.map((block, blockIndex) => (
            <div key={blockIndex} className="bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-md p-2 w-fit">
              <div className="mb-3">
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
                                 <h4 className="font-semibold mt-2 text-blue-600 dark:text-blue-400">{block.muscleGroup}</h4>
              </div>
              
              <div className="space-y-2">
                {block.exercises.map((exercise, exerciseIndex) => (
                  <div key={exerciseIndex} className="grid grid-cols-6 gap-0.5 text-xs min-w-[480px]">
                    {/* Exercise Category Dropdown */}
                    <select 
                      value={rowSelections[`${blockIndex}-${exerciseIndex}`]?.category || ''}
                      className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-18"
                      onChange={(e) => {
                        const rowKey = `${blockIndex}-${exerciseIndex}`;
                        setRowSelections(prev => ({
                          ...prev,
                          [rowKey]: {
                            category: e.target.value,
                            exercise: '', // Reset exercise when category changes
                            sets: prev[rowKey]?.sets || '',
                            reps: prev[rowKey]?.reps || {},
                            weight: prev[rowKey]?.weight || {}
                          }
                        }));
                        // Save to Firestore after a short delay
                        setTimeout(() => saveExerciseSelections(blockIndex, exerciseIndex), 500);
                      }}
                    >
                      <option value="">Category...</option>
                      {exerciseCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    
                    {/* Exercise Type Dropdown - Filtered by selected category */}
                    <select 
                      value={rowSelections[`${blockIndex}-${exerciseIndex}`]?.exercise || ''}
                      disabled={!rowSelections[`${blockIndex}-${exerciseIndex}`]?.category}
                      className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed w-18"
                      onChange={(e) => {
                        const rowKey = `${blockIndex}-${exerciseIndex}`;
                        setRowSelections(prev => ({
                          ...prev,
                          [rowKey]: {
                            ...prev[rowKey],
                            exercise: e.target.value,
                            sets: prev[rowKey]?.sets || '',
                            reps: prev[rowKey]?.reps || {},
                            weight: prev[rowKey]?.weight || {}
                          }
                        }));
                      }}
                    >
                      <option value="">Exercise...</option>
                      {rowSelections[`${blockIndex}-${exerciseIndex}`]?.category && exerciseCategories
                        .find(cat => cat.id === rowSelections[`${blockIndex}-${exerciseIndex}`]?.category)
                        ?.exercises.map((exerciseName) => (
                          <option key={exerciseName} value={exerciseName}>
                            {exerciseName}
                          </option>
                        ))}
                    </select>
                    
                    {/* Sets */}
                    <select 
                      value={rowSelections[`${blockIndex}-${exerciseIndex}`]?.sets || ''}
                      className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-14"
                      onChange={(e) => {
                        const rowKey = `${blockIndex}-${exerciseIndex}`;
                        setRowSelections(prev => ({
                          ...prev,
                          [rowKey]: {
                            ...prev[rowKey],
                            sets: e.target.value,
                            reps: '', // Reset reps when sets change
                            weight: '' // Reset weight when sets change
                          }
                        }));
                      }}
                    >
                      <option value="">Sets...</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                    </select>
                    
                    {/* All Reps Dropdowns - Stacked in one column */}
                    <div className="flex flex-col w-18">
                      {Array.from({ length: parseInt(rowSelections[`${blockIndex}-${exerciseIndex}`]?.sets) || 0 }, (_, setIndex) => (
                        <div key={`reps-${setIndex}`} className="flex items-center">
                          <select 
                            value={rowSelections[`${blockIndex}-${exerciseIndex}`]?.reps?.[setIndex] || ''}
                            disabled={!rowSelections[`${blockIndex}-${exerciseIndex}`]?.sets}
                            className="p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-xs w-full"
                            onChange={(e) => {
                              const rowKey = `${blockIndex}-${exerciseIndex}`;
                              setRowSelections(prev => ({
                                ...prev,
                                [rowKey]: {
                                  ...prev[rowKey],
                                  reps: {
                                    ...prev[rowKey]?.reps,
                                    [setIndex]: e.target.value
                                  }
                                }
                              }));
                            }}
                          >
                            <option value="">Reps...</option>
                            <option value="1">1</option>
                            <option value="3">3</option>
                            <option value="5">5</option>
                            <option value="8">8</option>
                            <option value="10">10</option>
                            <option value="12">12</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                            <option value="25">25</option>
                            <option value="30">30</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    
                    {/* All Weight Dropdowns - Stacked in one column */}
                    <div className="flex flex-col space-y-0.5 w-18">
                      {Array.from({ length: parseInt(rowSelections[`${blockIndex}-${exerciseIndex}`]?.sets) || 0 }, (_, setIndex) => (
                        <div key={`weight-${setIndex}`} className="flex items-center">
                          <select 
                            value={rowSelections[`${blockIndex}-${exerciseIndex}`]?.weight?.[setIndex] || ''}
                            disabled={!rowSelections[`${blockIndex}-${exerciseIndex}`]?.reps?.[setIndex]}
                            className="p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-xs w-full"
                            onChange={(e) => {
                              const rowKey = `${blockIndex}-${exerciseIndex}`;
                              setRowSelections(prev => ({
                                ...prev,
                                [rowKey]: {
                                  ...prev[rowKey],
                                  weight: {
                                    ...prev[rowKey]?.weight,
                                    [setIndex]: e.target.value
                                  }
                                }
                              }));
                            }}
                          >
                            <option value="">Weight...</option>
                            <option value="Max">Max</option>
                            <option value="95%">95%</option>
                            <option value="90%">90%</option>
                            <option value="85%">85%</option>
                            <option value="80%">80%</option>
                            <option value="75%">75%</option>
                            <option value="70%">70%</option>
                            <option value="65%">65%</option>
                            <option value="60%">60%</option>
                            <option value="55%">55%</option>
                            <option value="50%">50%</option>
                            <option value="45%">45%</option>
                            <option value="40%">40%</option>
                            <option value="35%">35%</option>
                            <option value="30%">30%</option>
                            <option value="25%">25%</option>
                            <option value="20%">20%</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    
                    {/* Completion Checkbox - Moved to rightmost column */}
                    <div className="flex items-center justify-center w-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        defaultChecked={(exercise as any).completed}
                        onChange={(e) => handleWorkoutCompletion(blockIndex, exerciseIndex, e.target.checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-3 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-xs">
                + Add Exercise Row
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderProgramsGrid = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your SweatSheets</h2>
        <div className="flex space-x-3">
          {canViewExerciseLibrary && (
            <button
              onClick={handleExerciseLibrary}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Exercise Library
            </button>
          )}
          {canCreateProgram && (
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedAthlete(e.target.value);
                    setViewMode('create-assign');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer appearance-none pr-8"
                defaultValue=""
              >
                <option value="" disabled>Select Athlete...</option>
                {athletes.map((athlete) => (
                  <option key={athlete.uid} value={athlete.uid}>
                    {athlete.firstName} {athlete.lastName}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-700">
        {['all', 'current', 'completed', 'draft'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as ProgramStatus | 'all')}
            className={`px-4 py-2 rounded-t-lg ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs
          .filter(program => filter === 'all' || program.status === filter)
          .map((program) => (
            <div
              key={program.athleteUid}
              onClick={() => handleProgramSelect(program)}
              className={`bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow ${
                selectedProgram?.athleteUid === program.athleteUid ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">{program.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  program.status === 'current' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  program.status === 'archived' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {program.status}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Phases:</span>
                  <span className="text-sm font-medium">{program.phases.length}/4</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Assigned to:</span>
                  <span className="text-sm font-medium">
                    {athletes.find(a => a.uid === program.athleteUid)?.firstName || 'Unknown'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{getCompletionPercentage(program)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getCompletionPercentage(program)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteProgram(program, e)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  const renderCreateAssignProgram = () => {
    const selectedAthleteData = athletes.find(a => a.uid === selectedAthlete);
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">Create & Assign SweatSheet</h2>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedAthleteData ? `For ${selectedAthleteData.firstName} ${selectedAthleteData.lastName}` : ''}
            </p>
          </div>
          <button
            onClick={() => {
              setViewMode('grid');
              setSelectedAthlete(null);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Programs
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-md p-6">
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">How it works:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• <strong>Create New:</strong> Build a custom program from scratch using exercises from your library</li>
              <li>• <strong>Assign Existing:</strong> Use pre-built program templates (coming soon)</li>
              <li>• <strong>Program Builder:</strong> Customize phases, blocks, and exercises</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Create New SweatSheet */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Create New SweatSheet</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Program Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Strength Training Program"
                  value={newProgramTitle}
                  onChange={(e) => setNewProgramTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Program Type
                </label>
                <select 
                  value={newProgramType}
                  onChange={(e) => setNewProgramType(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Strength Training">Strength Training</option>
                  <option value="Power Development">Power Development</option>
                  <option value="Endurance">Endurance</option>
                  <option value="Recovery">Recovery</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Phases
                </label>
                <select 
                  value={newProgramPhases}
                  onChange={(e) => setNewProgramPhases(parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={4}>4 Phases (Recommended)</option>
                  <option value={3}>3 Phases</option>
                  <option value={2}>2 Phases</option>
                  <option value={1}>1 Phase</option>
                </select>
              </div>
              
              <button 
                onClick={handleCreateNewProgram}
                disabled={!newProgramTitle.trim() || !selectedAthlete}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isBuildingProgram ? 'Building Program...' : 'Create SweatSheet'}
              </button>
              
              {/* Validation feedback */}
              {!selectedAthlete && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  ⚠️ Please select an athlete first
                </p>
              )}
              {!newProgramTitle.trim() && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  ⚠️ Please enter a program title
                </p>
              )}
            </div>
            
            {/* Assign Existing SweatSheet */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Assign Existing SweatSheet</h3>
              
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <p>Choose from pre-built program templates and customize them for your athlete. Templates include:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Strength Training:</strong> Build maximum strength with compound movements</li>
                  <li><strong>Power Development:</strong> Develop explosive power and athletic performance</li>
                  <li><strong>Endurance:</strong> Improve muscular and cardiovascular endurance</li>
                  <li><strong>Recovery:</strong> Maintain fitness while promoting recovery</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Template
                </label>
                <select 
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Choose a template...</option>
                  <option value="Strength Training Program">Strength Training Program</option>
                  <option value="Power Development Program">Power Development Program</option>
                  <option value="Endurance Program">Endurance Program</option>
                  <option value="Recovery Program">Recovery Program</option>
                </select>
              </div>
              
              {/* Template Preview */}
              {selectedTemplate && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <h5 className="font-semibold text-green-800 dark:text-green-300 mb-2">Template Preview</h5>
                  <div className="text-sm text-green-700 dark:text-green-400 space-y-2">
                    <div><strong>Program:</strong> {selectedTemplate}</div>
                    <div><strong>Description:</strong> {createProgramFromTemplate(selectedTemplate).description}</div>
                    <div><strong>Focus:</strong> {createProgramFromTemplate(selectedTemplate).focus}</div>
                    <div><strong>Difficulty:</strong> {createProgramFromTemplate(selectedTemplate).difficulty}</div>
                    <div><strong>Structure:</strong> 4 Phases × 8 Blocks × 6 Exercises</div>
                    <div><strong>Total Workouts:</strong> 192 exercises</div>
                    <div><strong>Estimated Duration:</strong> 8-12 weeks</div>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Customize for Athlete
                </label>
                <textarea
                  placeholder="Add any specific notes or modifications for this athlete..."
                  rows={3}
                  value={customizationNotes}
                  onChange={(e) => setCustomizationNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <button 
                onClick={handleAssignExistingProgram}
                disabled={!selectedTemplate || !selectedAthlete}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isAssigningProgram ? 'Assigning Program...' : 'Assign SweatSheet'}
              </button>
              
              {/* Validation feedback */}
              {!selectedAthlete && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  ⚠️ Please select an athlete first
                </p>
              )}
              {!selectedTemplate && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  ⚠️ Please select a program template
                </p>
              )}
            </div>
          </div>
          
          {/* Program Builder Section */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h4 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Program Builder</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Build your workout program using exercises from the Exercise Library
            </p>
            
            {/* Program Summary */}
            {newProgramTitle && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4 border border-blue-200 dark:border-blue-800">
                <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Program Summary</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-400">Title:</span> {newProgramTitle}
                  </div>
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-400">Type:</span> {newProgramType}
                  </div>
                  <div>
                    <span className="font-medium text-blue-700 dark:text-blue-400">Phases:</span> {newProgramPhases}
                  </div>
                </div>
              </div>
            )}
            
            {/* Phase 1 Preview */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Phase 1 Preview</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }, (_, blockIndex) => (
                  <div key={blockIndex} className="bg-white dark:bg-gray-600 rounded-lg p-3 border border-gray-200 dark:border-gray-500">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Block {blockIndex + 1}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {exerciseCategories.length > 0 ? (
                        <div className="space-y-1">
                          <div>Category: {exerciseCategories[0]?.name || 'Select...'}</div>
                          <div>Exercise: {exerciseCategories[0]?.exercises[0] || 'Select...'}</div>
                          <div>Sets: 3 | Reps: 10</div>
                        </div>
                      ) : (
                        <div className="text-gray-400">No exercises available</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button 
                onClick={() => setViewMode('exercise-library')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              >
                Manage Exercise Library
              </button>
              <button 
                onClick={() => setViewMode('detail')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                View Program Details
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
              >
                Back to Programs
              </button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h4 className="text-md font-semibold mb-4 text-gray-700 dark:text-gray-300">Quick Actions</h4>
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Copy from Another Athlete
              </button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Import from Template Library
              </button>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                Schedule Follow-up
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
    <div className="container mx-auto px-4 py-8">
      {viewMode === 'grid' && renderProgramsGrid()}
      {viewMode === 'detail' && renderSweatSheetDetail()}
      {viewMode === 'create-assign' && renderCreateAssignProgram()}
      {viewMode === 'exercise-library' && renderExerciseLibrary()}
    </div>
  );
};

export default Programs; 