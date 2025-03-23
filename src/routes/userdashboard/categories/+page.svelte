<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/firebase';
  import { getUserType } from '$lib/auth';
  import { notifications } from '$lib/components/Notification.svelte';
  import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc, type DocumentData } from 'firebase/firestore';

  const db = getFirestore();
  let categories: Record<string, Record<string, string[]>> = {};
  let loading = true;
  let newMainCategory = '';
  let newGroup = '';
  let newSubcategory = '';
  let selectedMainCategory = '';
  let selectedGroup = '';
  let categoryIcons: Record<string, string> = {};

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
      querySnapshot.forEach((doc) => {
        categories[doc.id] = doc.data();
      });
    } catch (err) {
      console.error('Error loading categories:', err);
      notifications.add('Error loading categories', 'error');
    }
  }

  async function addMainCategory() {
    if (!newMainCategory.trim()) {
      notifications.add('Please enter a category name', 'error');
      return;
    }

    try {
      await setDoc(doc(db, 'itemcategory', newMainCategory.trim()), {
        icon: categoryIcons[newMainCategory.trim()] || 'category'
      });
      await loadCategories();
      newMainCategory = '';
      categoryIcons[newMainCategory.trim()] = '';
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
      
      await setDoc(categoryRef, {
        ...currentData,
        [newGroup.trim()]: []
      });
      
      await loadCategories();
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
      const currentSubcategories = currentData[selectedGroup] || [];
      
      await setDoc(categoryRef, {
        ...currentData,
        [selectedGroup]: [...currentSubcategories, newSubcategory.trim()]
      });
      
      await loadCategories();
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
      await deleteDoc(doc(db, 'itemcategory', category));
      await loadCategories();
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
      const { [group]: _, ...rest } = currentData;
      
      await setDoc(categoryRef, rest);
      await loadCategories();
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
      const currentSubcategories = currentData[group] || [];
      
      await setDoc(categoryRef, {
        ...currentData,
        [group]: currentSubcategories.filter((sub: string) => sub !== subcategory)
      });
      
      await loadCategories();
      notifications.add('Subcategory deleted successfully');
    } catch (err) {
      console.error('Error deleting subcategory:', err);
      notifications.add('Error deleting subcategory', 'error');
    }
  }

  async function updateCategoryIcon(category: string) {
    try {
      const categoryRef = doc(db, 'itemcategory', category);
      const categoryDoc = await getDoc(categoryRef);
      const currentData = categoryDoc.data() || {};
      
      await setDoc(categoryRef, {
        ...currentData,
        icon: categoryIcons[category]
      });
      
      notifications.add('Category icon updated successfully');
    } catch (err) {
      console.error('Error updating category icon:', err);
      notifications.add('Error updating category icon', 'error');
    }
  }

  function extractIconName(iconString: string): string {
    const match = iconString.match(/icon="([^"]+)"/);
    return match ? match[1] : '';
  }
</script>

<svelte:head>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
</svelte:head>

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
      <div class="flex-1">
        <input
          type="text"
          bind:value={categoryIcons[newMainCategory.trim()]}
          placeholder="Paste icon tag (e.g., <iconify-icon icon='carbon:vehicle-api'></iconify-icon>)"
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
                {#if categoryIcons[category]}
                  {@html categoryIcons[category]}
                {:else}
                  <span class="material-symbols-outlined text-orange-500">category</span>
                {/if}
                <h4 class="text-lg font-medium text-gray-900">{category}</h4>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  bind:value={categoryIcons[category]}
                  placeholder="Paste icon tag (e.g., <iconify-icon icon='carbon:vehicle-api'></iconify-icon>)"
                  class="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  on:click={() => updateCategoryIcon(category)}
                  class="px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  Update Icon
                </button>
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

<style>
  :global(iconify-icon) {
    width: 24px;
    height: 24px;
  }
</style> 