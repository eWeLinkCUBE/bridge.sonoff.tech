<template>
    <div class="ewelink-capabilities">
        <div class="tag" v-for="item in capabilities" :key="item">
            {{ item }}
        </div>
    </div>
</template>
<script lang="ts" setup>
defineProps<{
    capabilities: string[];
}>();
</script>
<style scoped lang="scss">
.ewelink-capabilities {
    display: flex;
    column-gap: 6px;
    row-gap: 8px;
    flex-wrap: wrap;

    .tag {
        background: rgba(150, 150, 150, 0.1);
        border-radius: 6px 6px 6px 6px;
        white-space: nowrap;
        display: flex;
        align-items: center;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 500;
    }
}
</style>
