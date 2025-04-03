<script lang="ts">
  import { onMount } from 'svelte';
  import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc, type DocumentData } from 'firebase/firestore';
  import { notifications } from '$lib/components/Notification.svelte';
  import { categoriesStore, loadingStore, errorStore, updateCategories, deleteCategory, fetchCategories } from '$lib/store/items';

  const db = getFirestore();
  type CategoryGroups = Record<string, string[]>;
  interface CategoryData {
    icon?: string;
    [key: string]: string[] | string | undefined;
  }
  
  // Local state with reactive declarations
  let categories: Record<string, CategoryGroups> = {};
  let categoryIcons: Record<string, string> = {};
  $: loading = $loadingStore;

  // Subscribe to the categoriesStore with proper reactivity
  $: {
    // Transform the categories from the store format to the local format
    const categoriesArray = $categoriesStore;
    const newCategories: Record<string, CategoryGroups> = {};
    const newCategoryIcons: Record<string, string> = {};
    
    categoriesArray.forEach(cat => {
      newCategories[cat.name] = cat.groups;
      newCategoryIcons[cat.name] = cat.icon;
    });
    
    categories = newCategories;
    categoryIcons = newCategoryIcons;
  }

  let newMainCategory = '';
  let newGroup = '';
  let newSubcategory = '';
  let selectedMainCategory = '';
  let selectedGroup = '';

  const DEFAULT_ICON = '<iconify-icon icon="mdi:category"></iconify-icon>';

  onMount(async () => {
    await fetchCategories();
  });

  async function addMainCategory() {
    if (!newMainCategory.trim()) {
      notifications.add('Please enter a category name', 'error');
      return;
    }

    try {
      const docRef = doc(db, 'itemcategory', newMainCategory.trim());
      const newData: CategoryData = {
        icon: DEFAULT_ICON
      };
      await setDoc(docRef, newData);
      await fetchCategories();
      newMainCategory = '';
      notifications.add('Category added successfully');
    } catch (err) {
      console.error('Error adding category:', err);
      notifications.add('Error adding category', 'error');
    }
  }

  async function addGroup() {
    if (!selectedMainCategory || !newGroup.trim()) {
      notifications.add('Please select a category and enter a group name', 'error');
      return;
    }

    try {
      const categoryRef = doc(db, 'itemcategory', selectedMainCategory);
      const categoryDoc = await getDoc(categoryRef);
      const currentData = categoryDoc.data() || {};
      
      const newData: CategoryData = {
        icon: currentData.icon || DEFAULT_ICON,
        [newGroup.trim()]: []
      };

      // Add existing groups
      Object.entries(currentData).forEach(([key, value]) => {
        if (key !== 'icon' && Array.isArray(value)) {
          newData[key] = value;
        }
      });
      
      await updateCategories(selectedMainCategory, newData);
      await fetchCategories();
      newGroup = '';
      notifications.add('Group added successfully');
    } catch (err) {
      console.error('Error adding group:', err);
      notifications.add('Error adding group', 'error');
    }
  }

  async function addSubcategory() {
    if (!selectedMainCategory || !selectedGroup || !newSubcategory.trim()) {
      notifications.add('Please select a category, group, and enter a subcategory name', 'error');
      return;
    }

    try {
      const categoryRef = doc(db, 'itemcategory', selectedMainCategory);
      const categoryDoc = await getDoc(categoryRef);
      const currentData = categoryDoc.data() || {};
      
      const newData: CategoryData = {
        icon: currentData.icon || DEFAULT_ICON
      };

      // Add all existing groups
      Object.entries(currentData).forEach(([key, value]) => {
        if (key !== 'icon' && Array.isArray(value)) {
          if (key === selectedGroup) {
            newData[key] = [...value, newSubcategory.trim()];
          } else {
            newData[key] = value;
          }
        }
      });
      
      await updateCategories(selectedMainCategory, newData);
      await fetchCategories();
      newSubcategory = '';
      notifications.add('Subcategory added successfully');
    } catch (err) {
      console.error('Error adding subcategory:', err);
      notifications.add('Error adding subcategory', 'error');
    }
  }

  async function deleteMainCategory(category: string) {
    if (!confirm(`Are you sure you want to delete the category "${category}" and all its contents?`)) {
      return;
    }

    try {
      await deleteCategory(category);
      await fetchCategories();
      notifications.add('Category deleted successfully');
    } catch (err) {
      console.error('Error deleting category:', err);
      notifications.add('Error deleting category', 'error');
    }
  }

  async function deleteGroup(category: string, group: string) {
    if (!confirm(`Are you sure you want to delete the group "${group}" and all its subcategories?`)) {
      return;
    }

    try {
      const categoryRef = doc(db, 'itemcategory', category);
      const categoryDoc = await getDoc(categoryRef);
      const currentData = categoryDoc.data() || {};
      
      const newData: CategoryData = {
        icon: currentData.icon || DEFAULT_ICON
      };

      // Add all groups except the one being deleted
      Object.entries(currentData).forEach(([key, value]) => {
        if (key !== 'icon' && key !== group && Array.isArray(value)) {
          newData[key] = value;
        }
      });
      
      await updateCategories(category, newData);
      await fetchCategories();
      notifications.add('Group deleted successfully');
    } catch (err) {
      console.error('Error deleting group:', err);
      notifications.add('Error deleting group', 'error');
    }
  }

  async function deleteSubcategory(category: string, group: string, subcategory: string) {
    if (!confirm(`Are you sure you want to delete the subcategory "${subcategory}"?`)) {
      return;
    }

    try {
      const categoryRef = doc(db, 'itemcategory', category);
      const categoryDoc = await getDoc(categoryRef);
      const currentData = categoryDoc.data() || {};
      
      const newData: CategoryData = {
        icon: currentData.icon || DEFAULT_ICON
      };

      // Add all groups, filtering out the subcategory from the specified group
      Object.entries(currentData).forEach(([key, value]) => {
        if (key !== 'icon' && Array.isArray(value)) {
          if (key === group) {
            newData[key] = value.filter(sub => sub !== subcategory);
          } else {
            newData[key] = value;
          }
        }
      });
      
      await updateCategories(category, newData);
      await fetchCategories();
      notifications.add('Subcategory deleted successfully');
    } catch (err) {
      console.error('Error deleting subcategory:', err);
      notifications.add('Error deleting subcategory', 'error');
    }
  }

  async function updateCategoryIcon(category: string, iconTag: string) {
    if (!iconTag.trim()) {
      notifications.add('Please enter an icon tag', 'error');
      return;
    }

    try {
      const categoryRef = doc(db, 'itemcategory', category);
      const categoryDoc = await getDoc(categoryRef);
      const currentData = categoryDoc.data() || {};
      
      const newData: CategoryData = {
        icon: iconTag.trim()
      };

      // Preserve all existing groups
      Object.entries(currentData).forEach(([key, value]) => {
        if (key !== 'icon' && Array.isArray(value)) {
          newData[key] = value;
        }
      });
      
      await updateCategories(category, newData);
      categoryIcons[category] = iconTag.trim();
      notifications.add('Icon updated successfully');
    } catch (err) {
      console.error('Error updating icon:', err);
      notifications.add('Error updating icon', 'error');
    }
  }
</script>

<div class="space-y-6">
  <!-- Add Main Category -->
  <div class="bg-white rounded-lg shadow-sm p-4">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Add Main Category</h3>
    <div class="flex gap-4">
      <div class="flex-1">
        <input
          type="text"
          bind:value={newMainCategory}
          placeholder="Enter category name"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <button
        on:click={addMainCategory}
        class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        Add Category
      </button>
    </div>
  </div>

  <!-- Add Group -->
  <div class="bg-white rounded-lg shadow-sm p-4">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Add Group</h3>
    <div class="flex gap-4">
      <div class="flex-1">
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
        <input
          type="text"
          bind:value={newGroup}
          placeholder="Enter group name"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <button
        on:click={addGroup}
        class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        Add Group
      </button>
    </div>
  </div>

  <!-- Add Subcategory -->
  <div class="bg-white rounded-lg shadow-sm p-4">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Add Subcategory</h3>
    <div class="flex gap-4">
      <div class="flex-1">
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
        <select
          bind:value={selectedGroup}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Select Group</option>
          {#if selectedMainCategory && categories[selectedMainCategory]}
            {#each Object.keys(categories[selectedMainCategory]) as group}
              <option value={group}>{group}</option>
            {/each}
          {/if}
        </select>
      </div>
      <div class="flex-1">
        <input
          type="text"
          bind:value={newSubcategory}
          placeholder="Enter subcategory name"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <button
        on:click={addSubcategory}
        class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        Add Subcategory
      </button>
    </div>
  </div>

  <!-- Category List -->
  <div class="bg-white rounded-lg shadow-sm p-4">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
    {#if loading}
      <div class="text-center py-4">
        <span class="material-symbols-outlined text-4xl text-orange-500 animate-spin">sync</span>
      </div>
    {:else}
      <div class="space-y-6">
        {#each Object.entries(categories) as [category, groups]}
          <div class="border-b border-gray-200 pb-4 last:border-b-0">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                {@html categoryIcons[category]}
                <h4 class="text-lg font-medium text-gray-900">{category}</h4>
              </div>
              <div class="flex items-center gap-2">
                <button
                  on:click={() => deleteMainCategory(category)}
                  class="p-1 text-red-500 hover:text-red-600 focus:outline-none"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
            
            <div class="ml-8 space-y-3">
              {#each Object.entries(groups) as [group, subcategories]}
                <div class="border-l-2 border-gray-200 pl-4">
                  <div class="flex items-center justify-between mb-2">
                    <h5 class="text-md font-medium text-gray-700">{group}</h5>
                    <button
                      on:click={() => deleteGroup(category, group)}
                      class="p-1 text-red-500 hover:text-red-600 focus:outline-none"
                    >
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                  
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {#each subcategories as subcategory}
                      <div class="flex items-center justify-between bg-gray-50 rounded-md px-3 py-1.5">
                        <span class="text-sm text-gray-600">{subcategory}</span>
                        <button
                          on:click={() => deleteSubcategory(category, group, subcategory)}
                          class="p-1 text-red-500 hover:text-red-600 focus:outline-none"
                        >
                          <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
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