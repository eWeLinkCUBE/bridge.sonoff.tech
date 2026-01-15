<template>
    <div class="columns-show-hide">
        <div class="title">关闭选项即不显示对应的列，关闭网页再次进入需要重新设置（缺）</div>
        <div class="columns-options">
            <template v-for="item in columnsShowHideOptions" :key="item.key">
                <div class="column-option">
                    <div class="column-option-label">{{ item.label }}</div>
                    <div class="column-option-visible"><Switch v-model:checked="item.visible"></Switch></div>
                    <div class="columns-options"></div>
                </div>
                <template v-if="item.children?.length">
                    <div class="column-option" v-for="option in item.children" :key="option.key">
                        <div class="column-option-label children">{{ option.label }}</div>
                        <div class="column-option-visible"><Switch v-model:checked="option.visible"></Switch></div>
                    </div>
                </template>
            </template>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { useColumns } from '@/hooks/useColumns';
import { Switch } from 'ant-design-vue';
import { ref, watch } from 'vue';

const { columnsShowHideOptions } = useColumns();

const getMatterConfig = () => columnsShowHideOptions.value.find(({ key }) => key === 'matter');
const getChildVisible = (childKey: string) => getMatterConfig()?.children?.find(({ key }) => key === childKey)?.visible ?? false;
const skipMatterCascade = ref(false);

watch(
    () => ({
        matterVisible: getMatterConfig()?.visible ?? false,
        appleVisible: getChildVisible('appleSupported'),
        googleVisible: getChildVisible('googleSupported'),
        alexaVisible: getChildVisible('alexaSupported'),
        smartThingsVisible: getChildVisible('smartThingsSupported'),
    }),
    (nv, ov) => {
        const matterConfig = getMatterConfig();
        if (!matterConfig) return;

        const childChanged =
            ov.appleVisible !== nv.appleVisible || ov.googleVisible !== nv.googleVisible || ov.alexaVisible !== nv.alexaVisible || ov.smartThingsVisible !== nv.smartThingsVisible;

        const anyChildVisible = nv.appleVisible || nv.googleVisible || nv.alexaVisible || nv.smartThingsVisible;

        // child change drives parent visibility without triggering child cascade
        if (childChanged && anyChildVisible && !nv.matterVisible) {
            skipMatterCascade.value = true;
            matterConfig.visible = true;
            return;
        }

        if (skipMatterCascade.value) {
            skipMatterCascade.value = false;
            return;
        }

        // when matter is turned on by user, open all children
        if (!ov.matterVisible && nv.matterVisible) {
            matterConfig.children?.forEach((item) => {
                item.visible = true;
            });
        }

        // when matter is turned off by user, close all children
        if (ov.matterVisible && !nv.matterVisible) {
            matterConfig.children?.forEach((item) => {
                item.visible = false;
            });
        }
    }
);
</script>
<style lang="scss" scoped>
.columns-show-hide {
    width: 260px;
    padding: 4px;
    .title {
        color: #424242;
        line-height: 20px;
        margin-bottom: 4px;
    }

    .columns-options {
        @include flex(_, _, column);
        row-gap: 8px;
    }

    .column-option {
        color: #333333;
        line-height: 24px;
        @include flex();
        .column-option-visible {
            margin-left: auto;
        }

        .children {
            @include flex(_, center);
            &::before {
                content: '';
                display: inline-block;
                background-color: #333333;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                margin-right: 8px;
            }
        }
    }
}
</style>
