<template>
    <div class="cluster">
        <div class="cluster-tag" v-for="item in supported" :key="item">
            {{ item }}
        </div>
    </div>
    <Popover placement="bottomLeft" v-if="hasNotes">
        <template #content>
            <div class="li" v-for="note in notes" :key="note">{{ note }}</div>
        </template>
        <div class="cluster-tag" style="margin-top: 8px; cursor: pointer;">
            <img :src="warning" alt="" />
        </div>
    </Popover>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import warning from '@/assets/img/warning.png';
import { Popover } from 'ant-design-vue';

const props = defineProps<{
    supported: string[];
    notes: string[];
}>();

const hasNotes = computed(() => {
    return !!props.notes?.length;
});
</script>
<style scoped lang="scss">
.cluster {
    display: flex;
    column-gap: 6px;
    row-gap: 8px;
    flex-wrap: wrap;
}

.cluster-tag {
    background: rgba(150, 150, 150, 0.1);
    border-radius: 6px 6px 6px 6px;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 500;

    img {
        width: 16px;
        margin-right: 4px;
    }
}

.li {
    &::before {
        display: inline-block;
        content: '';
        width: 4px;
        height: 4px;
        border-radius: 2px;
        margin-right: 6px;
        margin-bottom: 3px;
        background-color: #333333;
    }
}
</style>
