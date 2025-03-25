<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/firebase';
  import { getUserType } from '$lib/auth';
  import { notifications } from '$lib/components/Notification.svelte';
  import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc, type DocumentData } from 'firebase/firestore';

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
  <div class="bg-white rounded-lg shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="border-b border-gray-200 p-4">
      <h3 class="text-lg font-semibold text-gray-900">Category Management</h3>
      <p class="mt-1 text-sm text-gray-500">Manage your store categories, groups, and subcategories</p>
    </div>

    <!-- Add/Edit Category Section -->
    <div class="p-4 space-y-4">
      <!-- Category Selection/Creation -->
      <div class="flex gap-4 items-start">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Select Category to Edit</label>
          <select
            bind:value={selectedMainCategory}
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select Category</option>
            {#each Object.keys(categories) as category}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Or Create New Category</label>
          <div class="flex gap-2">
            <input
              type="text"
              bind:value={newMainCategory}
              placeholder="Enter category name"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Category Icon</label>
          <div class="flex gap-2 items-center">
            <input
              type="text"
              bind:value={newIconInput}
              placeholder="Paste icon tag (e.g., <iconify-icon icon='mdi:car'></iconify-icon>)"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              on:input={() => updateIcon(newIconInput)}
            />
          </div>
          <div class="mt-2 flex items-center gap-2">
            <span class="text-sm text-gray-500">Icon Preview:</span>
            {@html editingCategory.icon}
          </div>
        </div>

        <!-- Groups and Subcategories -->
        <div class="border-t border-gray-200 pt-4 mt-4">
          <div class="space-y-4">
            <!-- Add Group -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Add Group to {selectedMainCategory || newMainCategory}
              </label>
              <div class="flex gap-2">
                <input
                  type="text"
                  bind:value={newGroup}
                  placeholder="Enter group name"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  on:click={addGroup}
                  class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  Add Group
                </button>
              </div>
            </div>

            <!-- Groups List -->
            <div class="space-y-4">
              {#each Object.entries(editingCategory) as [key, value]}
                {#if key !== 'icon' && Array.isArray(value)}
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                      <h5 class="text-md font-medium text-gray-700">{key}</h5>
                      <button
                        on:click={() => deleteGroup(key)}
                        class="p-1 text-red-500 hover:text-red-600 focus:outline-none"
                      >
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>

                    <!-- Add Subcategory -->
                    <div class="mb-3">
                      <div class="flex gap-2">
                        <input
                          type="text"
                          bind:value={newSubcategory}
                          placeholder="Enter subcategory name"
                          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          on:click={() => addSubcategory(key)}
                          class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          Add Subcategory
                        </button>
                      </div>
                    </div>

                    <!-- Subcategories Grid -->
                    {#if value.length > 0}
                      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {#each value as subcategory}
                          <div class="flex items-center justify-between bg-white rounded-md px-3 py-1.5 shadow-sm">
                            <span class="text-sm text-gray-600">{subcategory}</span>
                            <button
                              on:click={() => deleteSubcategory(key, subcategory)}
                              class="p-1 text-red-500 hover:text-red-600 focus:outline-none"
                            >
                              <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        {/each}
                      </div>
                    {:else}
                      <p class="text-sm text-gray-500 italic">No subcategories yet</p>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="border-t border-gray-200 pt-4 mt-4 flex justify-between">
          <div class="flex items-center gap-2">
            <button
              on:click={saveChanges}
              disabled={!hasUnsavedChanges}
              class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
            {#if hasUnsavedChanges}
              <span class="text-sm text-orange-500">You have unsaved changes</span>
            {/if}
          </div>
          
          {#if selectedMainCategory}
            <button
              on:click={() => deleteMainCategory(selectedMainCategory)}
              class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete Category
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Categories Overview -->
  <div class="bg-white rounded-lg shadow-sm p-4">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Categories Overview</h3>
    {#if loading}
      <div class="text-center py-4">
        <span class="material-symbols-outlined text-4xl text-orange-500 animate-spin">sync</span>
      </div>
    {:else}
      <div class="space-y-6">
        {#each Object.entries(categories) as [category, groups]}
          <div class="border-b border-gray-200 pb-4 last:border-b-0">
            <div class="flex items-center gap-2 mb-2">
              {@html categoryIcons[category]}
              <h4 class="text-lg font-medium text-gray-900">{category}</h4>
            </div>
            
            <div class="ml-8 space-y-3">
              {#each Object.entries(groups) as [group, subcategories]}
                <div class="border-l-2 border-gray-200 pl-4">
                  <h5 class="text-md font-medium text-gray-700 mb-2">{group}</h5>
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {#each subcategories as subcategory}
                      <div class="bg-gray-50 rounded-md px-3 py-1.5">
                        <span class="text-sm text-gray-600">{subcategory}</span>
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

<style>
  :global(iconify-icon) {
    width: 24px;
    height: 24px;
    color: #f97316; /* text-orange-500 */
  }
</style> 