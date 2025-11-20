<template>
    <div class="cluster">
        <div class="cluster-tag supported" v-for="item in supported" :key="item">
            <img :src="correct" alt="" />
            {{ item }}
        </div>
        <div class="cluster-tag unsupported" v-for="item in unsupported" :key="item">
            <img :src="wrong" alt="" />
            {{ item }}
        </div>
    </div>
</template>
<script lang="ts" setup>
import correct from '@/assets/img/correct.png';
import wrong from '@/assets/img/wrong.png';
defineProps<{
    supported: string[];
    unsupported: string[];
}>();
</script>
<style scoped lang="scss">
.cluster {
    display: flex;
    column-gap: 6px;
    row-gap: 8px;
    flex-wrap: wrap;

    img {
        width: 16px;
        margin-right: 4px;
    }

    .cluster-tag {
        background: rgba(150, 150, 150, 0.1);
        border-radius: 6px 6px 6px 6px;
        white-space: nowrap;
        display: flex;
        align-items: center;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: 500;

        &.supported {
            color: #52c41a;
        }

        &.unsupported {
            color: #ff5c5b;
        }
    }
}
</style>
