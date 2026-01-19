<template>
    <div class="feature-comparison-modal" ref="featureComparisonModal">
        <Modal :open="visible" :closable="false" :get-container="featureComparisonModal" :destroyOnClose="true" :footer="null" width="440px" centered>
            <div class="modal-content">
                <div class="title">{{ PAGE_TITLE }}</div>
                <div class="content">
                    <div class="introduce">
                        The device compatibility and feature matrix shows all devices that can be connected to the Bridge, the platforms these devices can be integrated with, and
                        the corresponding capabilities. The data in this table reflects the devices supported by the latest firmware version. If there is any discrepancy between
                        the devices shown here and your actual experience, please upgrade the gateway to the latest version first.
                    </div>
                    <div class="content-info">
                        <div class="content-title">Supported Device Types</div>
                        <div class="item" v-for="item in supportDeviceTypesOptions" :key="item.label">
                            <img :src="item.icon" class="icon" alt="" />
                            {{ item.label }}
                        </div>
                    </div>
                    <div class="content-info">
                        <div class="content-title">Supported Sync Platforms</div>
                        <div class="item" v-for="item in supportPlatformsOptions" :key="item.label">
                            <img :src="item.icon" class="icon" alt="" />
                            {{ item.label }}
                        </div>
                    </div>
                </div>
                <div class="footer">
                    <Button type="primary" class="footer-button" @click="$emit('cancel')">Got it</Button>
                </div>
            </div>
        </Modal>
    </div>
</template>
<script lang="ts" setup>
import { Modal, Button } from 'ant-design-vue';
import { ref } from 'vue';
import zigbee from '@/assets/img/zigbee.png';
import eWeLink from '@/assets/img/eWeLink.png';
import homeAssistant from '@/assets/img/homeAssistant.png';
import remote from '@/assets/img/remote.png';
import eWeLinkLogo from '@/assets/img/eWeLinkLogo.png';
import appleHome from '@/assets/img/appleHome.png';
import googleHome from '@/assets/img/googleHome.png';
import amazoneAlexa from '@/assets/img/amazoneAlexa.png';
import smartThings from '@/assets/img/smartThings.png';
import { PAGE_TITLE } from '@/contants';

defineEmits(['cancel']);
defineProps<{
    visible: boolean;
}>();
const supportDeviceTypesOptions = [
    {
        label: 'Zigbee',
        icon: zigbee,
    },
    {
        label: 'eWeLink Devices ',
        icon: eWeLinkLogo,
    },
    {
        label: 'Home Assistant Entities',
        icon: homeAssistant,
    },
    {
        label: 'eWeLink Remote sub-devices',
        icon: remote,
    },
];

const supportPlatformsOptions = [
    {
        label: 'eWeLink',
        icon: eWeLink,
    },
    {
        label: 'Apple Home',
        icon: appleHome,
    },
    {
        label: 'Google Home',
        icon: googleHome,
    },
    {
        label: 'Amazon Alexa',
        icon: amazoneAlexa,
    },
    {
        label: 'SmartThings',
        icon: smartThings,
    },
    {
        label: 'Home Assistant',
        icon: homeAssistant,
    },
];
const featureComparisonModal = ref<HTMLElement>();
</script>
<style lang="scss" scoped>
.modal-content {
    margin-top: -2px;
    padding-bottom: 4px;
    .title {
        font-weight: 600;
        font-size: 18px;
        color: #333333;
        text-align: center;
        margin-bottom: 33px;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .introduce {
            font-size: 14px;
            color: #424242;
            line-height: 20px;
        }

        .content-info {
            display: flex;
            flex-direction: column;
            gap: 8px;

            .content-title {
                color: #ffc300;
                font-weight: 400;
                font-size: 14px;
            }
            .item {
                color: #424242;
                font-weight: 400;
                font-size: 14px;
                @include flex(_, center);

                .icon {
                    width: 20px;
                    margin-right: 4px;
                }
            }
        }
    }

    .footer {
        margin-top: 24px;
        text-align: center;

        .footer-button {
            border-radius: 73px;
            height: 40px;
            width: 173px;
        }
    }
}
</style>
