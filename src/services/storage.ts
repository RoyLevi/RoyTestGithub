import AsyncStorage from '@react-native-async-storage/async-storage';
import { SavedRecipe } from '../types';

const STORAGE_KEY = 'vaportime_recipes';

export async function loadRecipes(): Promise<SavedRecipe[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedRecipe[];
  } catch {
    return [];
  }
}

export async function saveRecipe(recipe: SavedRecipe): Promise<void> {
  const existing = await loadRecipes();
  // Replace if same id, otherwise append
  const idx = existing.findIndex((r) => r.id === recipe.id);
  if (idx >= 0) {
    existing[idx] = recipe;
  } else {
    existing.unshift(recipe); // newest first
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export async function deleteRecipe(id: string): Promise<void> {
  const existing = await loadRecipes();
  const updated = existing.filter((r) => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
