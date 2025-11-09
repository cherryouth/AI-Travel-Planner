<template>
  <section class="profile">
    <el-page-header content="账户与偏好" />

    <el-alert
      v-if="!isAuthenticated"
      type="info"
      show-icon
      :closable="false"
      title="登录后即可同步你的旅行偏好，跨设备保持一致"
    />

    <el-card v-else class="profile__card" shadow="hover">
      <el-form label-width="110px" class="profile__form">
        <el-form-item label="默认旅行节奏">
          <el-radio-group v-model="form.defaultPace">
            <el-radio-button label="relaxed">轻松</el-radio-button>
            <el-radio-button label="balanced">均衡</el-radio-button>
            <el-radio-button label="intensive">紧凑</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="偏好主题">
          <el-select
            v-model="form.defaultThemes"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择常用旅行主题"
          >
            <el-option
              v-for="option in plannerStore.preferenceTagOptions"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="form.kidFriendly">偏好亲子友好行程</el-checkbox>
        </el-form-item>

        <el-form-item label="必去/必备项目">
          <el-select
            v-model="form.mustHave"
            multiple
            allow-create
            filterable
            placeholder="添加你常提及的需求，例如：当地美食、轻徒步"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="常用出发地或机场">
          <el-input v-model="form.homeAirport" placeholder="例如：上海虹桥 / PVG" maxlength="40" />
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.notes"
            type="textarea"
            :rows="4"
            maxlength="200"
            placeholder="记录其他旅行偏好、常旅客信息或健康提醒"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSavePreferences">
            保存偏好
          </el-button>
          <el-button link :disabled="!hasProfile" @click="restoreFromProfile">
            还原已保存的偏好
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { usePlanLibraryStore } from '../stores/planLibrary';
import { usePlannerStore } from '../stores/planner';

const authStore = useAuthStore();
const planLibraryStore = usePlanLibraryStore();
const plannerStore = usePlannerStore();

const { isAuthenticated, user } = storeToRefs(authStore);

const saving = ref(false);
const form = reactive({
  defaultPace: 'balanced' as 'relaxed' | 'balanced' | 'intensive',
  defaultThemes: [] as string[],
  kidFriendly: false,
  mustHave: [] as string[],
  homeAirport: '',
  notes: '',
});

const hasProfile = computed(() => Boolean(planLibraryStore.state.preferenceProfile));

function applyProfile() {
  const profile = planLibraryStore.state.preferenceProfile;
  if (!profile) {
    return;
  }
  form.defaultPace = profile.defaultPace ?? 'balanced';
  form.defaultThemes = [...(profile.defaultThemes ?? [])];
  form.kidFriendly = profile.kidFriendly ?? false;
  form.mustHave = [...(profile.mustHave ?? [])];
  form.homeAirport = profile.homeAirport ?? '';
  form.notes = profile.notes ?? '';
}

function restoreFromProfile() {
  applyProfile();
  ElMessage.success('已根据云端记录还原偏好设置');
}

async function loadProfile() {
  try {
    const profile = await planLibraryStore.loadPreferenceProfile();
    if (profile) {
      applyProfile();
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

async function handleSavePreferences() {
  if (!isAuthenticated.value) {
    ElMessage.warning('请登录后再保存偏好');
    return;
  }
  saving.value = true;
  try {
    await planLibraryStore.savePreferenceProfile({
      defaultPace: form.defaultPace,
      defaultThemes: form.defaultThemes,
      kidFriendly: form.kidFriendly,
      mustHave: form.mustHave,
      homeAirport: form.homeAirport || null,
      notes: form.notes || null,
    });
    ElMessage.success('偏好设置已保存到云端');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    saving.value = false;
  }
}

watch(
  user,
  value => {
    if (value) {
      void loadProfile();
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (isAuthenticated.value) {
    void loadProfile();
  }
});
</script>

<style scoped>
.profile {
  display: grid;
  gap: 1.5rem;
}

.profile__card {
  padding: 1.5rem;
}

.profile__form {
  display: grid;
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .profile__card {
    padding: 1rem;
  }
}
</style>
