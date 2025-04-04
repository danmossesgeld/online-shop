<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/firebase';
  import { getUserType } from '$lib/auth';
  import { notifications } from '$lib/components/Notification.svelte';
  import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc, type DocumentData } from 'firebase/firestore';
  import { categoriesStore, fetchCategories } from '$lib/store/items';

  const db = getFirestore();
  interface CategoryData {
    icon?: string;
    [key: string]: string[] | string | undefined;
  }

  let categories: Record<string, Record<string, string[]>> = {};
  let loading = true;
  let newMainCategory = '';
  let newGroup = '';
  let newSubcategory = '';
  let selectedMainCategory = '';
  let selectedGroup = '';
  let newIconInput = '';
  let categoryIcons: Record<string, string> = {};
  
  // Track unsaved changes
  let hasUnsavedChanges = false;
  let editingCategory: CategoryData | null = null;
  let originalCategory: CategoryData | null = null;

  const DEFAULT_ICON = '<iconify-icon icon="mdi:category"></iconify-icon>';

  onMount(async () => {
    const user = auth.currentUser;
    if (!user) {
      goto('/login');
      return;
    }
    
    try {
      const userType = await getUserType(user.uid);
      if (userType !== 'admin') {
        goto('/userdashboard');
        return;
      }
      await loadCategories();
    } catch (err) {
      console.error('Error loading categories:', err);
      notifications.add('Error loading categories', 'error');
    } finally {
      loading = false;
    }
  });

  async function loadCategories() {
    try {
      const querySnapshot = await getDocs(collection(db, 'itemcategory'));
      categories = {};
      categoryIcons = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as CategoryData;
        const groups: Record<string, string[]> = {};
        
        Object.entries(data).forEach(([key, value]) => {
          if (key !== 'icon' && Array.isArray(value)) {
            groups[key] = value;
          }
        });
        
        categories[doc.id] = groups;
        categoryIcons[doc.id] = data.icon || DEFAULT_ICON;
      });
    } catch (err) {
      console.error('Error loading categories:', err);
      notifications.add('Error loading categories', 'error');
    }
  }

  function initNewCategory() {
    editingCategory = {
      icon: newIconInput.trim() || DEFAULT_ICON
    };
    originalCategory = null;
    hasUnsavedChanges = true;
  }

  async function loadCategoryForEditing(categoryName: string) {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Do you want to discard them?')) {
        return;
      }
    }

    const categoryRef = doc(db, 'itemcategory', categoryName);
    const categoryDoc = await getDoc(categoryRef);
    const data = categoryDoc.data() as CategoryData;
    
    editingCategory = { ...data };
    originalCategory = { ...data };
    newIconInput = data.icon || DEFAULT_ICON;
    hasUnsavedChanges = false;
  }

  function addGroup() {
    if (!editingCategory || !newGroup.trim()) {
      notifications.add('Please enter a group name', 'error');
      return;
    }

    editingCategory = {
      ...editingCategory,
      [newGroup.trim()]: []
    };
    
    newGroup = '';
    hasUnsavedChanges = true;
  }

  function addSubcategory(group: string) {
    if (!editingCategory || !newSubcategory.trim()) {
      notifications.add('Please enter a subcategory name', 'error');
      return;
    }

    const currentSubcategories = editingCategory[group] as string[] || [];
    editingCategory = {
      ...editingCategory,
      [group]: [...currentSubcategories, newSubcategory.trim()]
    };
    
    newSubcategory = '';
    hasUnsavedChanges = true;
  }

  function deleteGroup(group: string) {
    if (!editingCategory) return;
    
    const { [group]: _, ...rest } = editingCategory;
    editingCategory = rest;
    hasUnsavedChanges = true;
  }

  function deleteSubcategory(group: string, subcategory: string) {
    if (!editingCategory) return;
    
    const currentSubcategories = editingCategory[group] as string[] || [];
    editingCategory = {
      ...editingCategory,
      [group]: currentSubcategories.filter(sub => sub !== subcategory)
    };
    hasUnsavedChanges = true;
  }

  function updateIcon(newIcon: string) {
    if (!editingCategory) return;
    
    editingCategory = {
      ...editingCategory,
      icon: newIcon.trim() || DEFAULT_ICON
    };
    hasUnsavedChanges = true;
  }

  async function saveChanges() {
    if (!editingCategory) return;
    
    try {
      const categoryName = selectedMainCategory || newMainCategory.trim();
      if (!categoryName) {
        notifications.add('Please enter a category name', 'error');
        return;
      }

      const categoryRef = doc(db, 'itemcategory', categoryName);
      await setDoc(categoryRef, editingCategory);
      
      await loadCategories();
      await fetchCategories();
      hasUnsavedChanges = false;
      originalCategory = { ...editingCategory };
      
      if (newMainCategory) {
        newMainCategory = '';
        editingCategory = null;
      }
      
      notifications.add('Category saved successfully');
    } catch (err) {
      console.error('Error saving category:', err);
      notifications.add('Error saving category', 'error');
    }
  }

  async function deleteMainCategory(category: string) {
    if (!confirm(`Are you sure you want to delete the category "${category}" and all its contents?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'itemcategory', category));
      await loadCategories();
      await fetchCategories();
      editingCategory = null;
      originalCategory = null;
      hasUnsavedChanges = false;
      selectedMainCategory = '';
      notifications.add('Category deleted successfully');
    } catch (err) {
      console.error('Error deleting category:', err);
      notifications.add('Error deleting category', 'error');
    }
  }

  $: {
    if (selectedMainCategory) {
      loadCategoryForEditing(selectedMainCategory);
    }
  }
</script>

<svelte:head>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
</svelte:head>

<div class="space-y-6 max-w-5xl mx-auto">
  <!-- Category Management -->
  <div class="card bg-base-100 shadow-sm">
    <!-- Header -->
    <div class="border-b border-base-300 p-4">
      <h3 class="text-lg font-semibold text-base-content">Category Management</h3>
      <p class="mt-1 text-sm text-base-content/60">Manage your store categories, groups, and subcategories</p>
    </div>

    <!-- Add/Edit Category Section -->
    <div class="p-4 space-y-4">
      <!-- Category Selection/Creation -->
      <div class="flex gap-4 items-start">
        <div class="flex-1">
          <label for="category-select" class="block text-sm font-medium text-base-content mb-1">Select Category to Edit</label>
          <select
            id="category-select"
            bind:value={selectedMainCategory}
            class="select select-bordered w-full"
          >
            <option value="">Select Category</option>
            {#each Object.keys(categories) as category}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </div>
        <div class="flex-1">
          <label for="new-category" class="block text-sm font-medium text-base-content mb-1">Or Create New Category</label>
          <div class="flex gap-2">
            <input
              id="new-category"
              type="text"
              bind:value={newMainCategory}
              placeholder="Enter category name"
              class="input input-bordered w-full"
              on:input={() => {
                if (newMainCategory && !editingCategory) {
                  initNewCategory();
                }
              }}
            />
          </div>
        </div>
      </div>

      {#if editingCategory}
        <!-- Icon Input -->
        <div>
          <label for="category-icon" class="block text-sm font-medium text-base-content mb-1">Category Icon</label>
          <div class="flex gap-2 items-center">
            <input
              id="category-icon"
              type="text"
              bind:value={newIconInput}
              placeholder="Paste icon tag (e.g., <iconify-icon icon='mdi:car'></iconify-icon>)"
              class="input input-bordered w-full"
              on:input={() => updateIcon(newIconInput)}
            />
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span class="text-sm text-base-content/60">Icon Preview:</span>
            {@html editingCategory.icon}
          </div>
        </div>

        <!-- Groups and Subcategories -->
        <div class="border-t border-base-300 pt-4 mt-4">
          <div class="space-y-4">
            <!-- Add Group -->
            <div>
              <label for="new-group" class="block text-sm font-medium text-base-content mb-1">
                Add Group to {selectedMainCategory || newMainCategory}
              </label>
              <div class="flex gap-2">
                <input
                  id="new-group"
                  type="text"
                  bind:value={newGroup}
                  placeholder="Enter group name"
                  class="input input-bordered flex-1"
                />
                <button
                  on:click={addGroup}
                  class="btn btn-primary"
                >
                  Add Group
                </button>
              </div>
            </div>

            <!-- Groups List -->
            <div class="space-y-4">
              {#each Object.entries(editingCategory) as [key, value]}
                {#if key !== 'icon' && Array.isArray(value)}
                  <div class="bg-base-200 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h5 class="text-md font-medium text-base-content">{key}</h5>
                      <button
                        on:click={() => deleteGroup(key)}
                        class="btn btn-ghost btn-sm text-error"
                      >
                        <iconify-icon icon="material-symbols:delete" width="20" height="20" class="text-error/70 hover:text-error"></iconify-icon>
                      </button>
                    </div>

                    <!-- Add Subcategory -->
                    <div class="mb-3">
                      <div class="flex gap-2">
                        <input
                          type="text"
                          bind:value={newSubcategory}
                          placeholder="Enter subcategory name"
                          class="input input-bordered flex-1"
                        />
                        <button
                          on:click={() => addSubcategory(key)}
                          class="btn btn-primary"
                        >
                          Add Subcategory
                        </button>
                      </div>
                    </div>

                    <!-- Subcategories Grid -->
                    {#if value.length > 0}
                      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {#each value as subcategory}
                          <div class="flex items-center justify-between bg-base-100 rounded-md px-3 py-1.5 shadow-sm">
                            <span class="text-sm text-base-content/70">{subcategory}</span>
                            <button
                              on:click={() => deleteSubcategory(key, subcategory)}
                              class="btn btn-ghost btn-xs text-error"
                            >
                              <iconify-icon icon="material-symbols:delete" width="16" height="16" class="text-error/70 hover:text-error"></iconify-icon>
                            </button>
                          </div>
                        {/each}
                      </div>
                    {:else}
                      <p class="text-sm text-base-content/50 italic">No subcategories yet</p>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="border-t border-base-300 pt-4 mt-4 flex justify-between">
          <div class="flex items-center gap-2">
            <button
              on:click={saveChanges}
              disabled={!hasUnsavedChanges}
              class="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
            {#if hasUnsavedChanges}
              <span class="text-sm text-warning">You have unsaved changes</span>
            {/if}
          </div>
          
          {#if selectedMainCategory}
            <button
              on:click={() => deleteMainCategory(selectedMainCategory)}
              class="btn btn-error"
            >
              Delete Category
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Categories Overview -->
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <h3 class="text-lg font-semibold text-base-content mb-4">Categories Overview</h3>
      {#if loading}
        <div class="flex justify-center py-4">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      {:else}
        <div class="space-y-6">
          {#each Object.entries(categories) as [category, groups]}
            <div class="border-b border-base-300 pb-4 last:border-b-0">
              <div class="flex items-center gap-2 mb-2">
                {@html categoryIcons[category]}
                <h4 class="text-lg font-medium text-base-content">{category}</h4>
              </div>
              
              <div class="ml-8 space-y-3">
                {#each Object.entries(groups) as [group, subcategories]}
                  <div class="border-l-2 border-base-300 pl-4">
                    <h5 class="text-md font-medium text-base-content/80 mb-2">{group}</h5>
                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {#each subcategories as subcategory}
                        <div class="bg-base-200 rounded-md px-3 py-1.5">
                          <span class="text-sm text-base-content/70">{subcategory}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(iconify-icon) {
    width: 24px;
    height: 24px;
    color: hsl(var(--p) / 0.7); /* Use primary color with opacity */
  }
  :global(iconify-icon:hover) {
    color: hsl(var(--p)); /* Full opacity on hover */
  }
</style> 