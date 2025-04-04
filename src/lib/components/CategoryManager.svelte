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
    if (!category || !group) {
      notifications.add('Invalid category or group', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete the group "${group}" and all its subcategories?`)) {
      return;
    }

    try {
      const categoryRef = doc(db, 'itemcategory', category);
      const categoryDoc = await getDoc(categoryRef);
      
      if (!categoryDoc.exists()) {
        notifications.add('Category not found', 'error');
        return;
      }

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
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h3 class="card-title text-lg font-semibold text-base-content">Add Main Category</h3>
      <div class="flex gap-4">
        <div class="form-control flex-1">
          <input
            type="text"
            bind:value={newMainCategory}
            placeholder="Enter category name"
            class="input input-bordered w-full"
          />
        </div>
        <button
          on:click={addMainCategory}
          class="btn btn-primary"
        >
          Add Category
        </button>
      </div>
    </div>
  </div>

  <!-- Add Group -->
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h3 class="card-title text-lg font-semibold text-base-content">Add Group</h3>
      <div class="flex gap-4">
        <div class="form-control flex-1">
          <select
            bind:value={selectedMainCategory}
            class="select select-bordered w-full"
          >
            <option value="">Select Category</option>
            {#each Object.keys(categories) as category}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </div>
        <div class="form-control flex-1">
          <input
            type="text"
            bind:value={newGroup}
            placeholder="Enter group name"
            class="input input-bordered w-full"
          />
        </div>
        <button
          on:click={addGroup}
          class="btn btn-primary"
        >
          Add Group
        </button>
      </div>
    </div>
  </div>

  <!-- Add Subcategory -->
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h3 class="card-title text-lg font-semibold text-base-content">Add Subcategory</h3>
      <div class="flex gap-4">
        <div class="form-control flex-1">
          <select
            bind:value={selectedMainCategory}
            class="select select-bordered w-full"
          >
            <option value="">Select Category</option>
            {#each Object.keys(categories) as category}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </div>
        <div class="form-control flex-1">
          <select
            bind:value={selectedGroup}
            class="select select-bordered w-full"
          >
            <option value="">Select Group</option>
            {#if selectedMainCategory && categories[selectedMainCategory]}
              {#each Object.keys(categories[selectedMainCategory]) as group}
                <option value={group}>{group}</option>
              {/each}
            {/if}
          </select>
        </div>
        <div class="form-control flex-1">
          <input
            type="text"
            bind:value={newSubcategory}
            placeholder="Enter subcategory name"
            class="input input-bordered w-full"
          />
        </div>
        <button
          on:click={addSubcategory}
          class="btn btn-primary"
        >
          Add Subcategory
        </button>
      </div>
    </div>
  </div>

  <!-- Category List -->
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h3 class="card-title text-lg font-semibold text-base-content">Categories</h3>
      {#if loading}
        <div class="flex justify-center py-4">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      {:else}
        <div class="space-y-6">
          {#each Object.entries(categories) as [category, groups]}
            <div class="divider"></div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                {@html categoryIcons[category]}
                <h4 class="text-lg font-medium text-base-content">{category}</h4>
              </div>
              <div class="flex items-center gap-2">
                <button
                  on:click={() => deleteMainCategory(category)}
                  class="btn btn-ghost btn-sm text-error"
                >
                  <iconify-icon icon="material-symbols:delete" width="20" height="20"></iconify-icon>
                </button>
              </div>
            </div>
            
            <div class="ml-8 space-y-3">
              {#each Object.entries(groups) as [group, subcategories]}
                <div class="border-l-2 border-base-300 pl-4">
                  <div class="flex items-center justify-between mb-2">
                    <h5 class="text-md font-medium text-base-content/80">{group}</h5>
                    <button
                      on:click={() => deleteGroup(category, group)}
                      class="btn btn-ghost btn-sm text-error"
                    >
                      <iconify-icon icon="material-symbols:delete" width="20" height="20"></iconify-icon>
                    </button>
                  </div>
                  
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {#each subcategories as subcategory}
                      <div class="flex items-center justify-between bg-base-200 rounded-lg px-3 py-1.5">
                        <span class="text-sm text-base-content/70">{subcategory}</span>
                        <button
                          on:click={() => deleteSubcategory(category, group, subcategory)}
                          class="btn btn-ghost btn-xs text-error"
                        >
                          <iconify-icon icon="material-symbols:delete" width="16" height="16"></iconify-icon>
                        </button>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div> 