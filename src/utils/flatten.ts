import type { FlatRow, RawDevice, MatterDevice, ThirdPartyAppSupport } from '../types/data';

const normalizeList = (list?: string[] | null) => (list && list.length ? list : []);

const buildSearchText = (parts: Array<string | undefined | null>) =>
    parts
        .flatMap((part) => (Array.isArray(part) ? part : [part]))
        .filter((segment): segment is string => Boolean(segment && segment.trim()))
        .join(' ');

function mapThirdParty(supports: ThirdPartyAppSupport[] | undefined, appName: string): { supported: string[]; notes: string[] } {
    const found = supports?.find((app) => app.appName === appName);
    return {
        supported: normalizeList(found?.supportedClusters),
        notes: normalizeList(found?.notes),
    };
}

export function flattenDevice(device: RawDevice, index: number): FlatRow[] {
    const parentId = `${device.deviceInfo.model}-${index}`;
    const ewelinkSupported = Boolean(device.ewelinkCloud?.isSupported);
    const matterSupported = Boolean(device.matterBridge?.isSupported);
    const haSupported = Boolean(device.homeAssistant?.isSupported);

    const matterDevices = matterSupported && device.matterBridge?.devices?.length ? device.matterBridge.devices! : [null];

    const span = matterDevices.length || 1;

    return matterDevices.map((matterDev: MatterDevice | null, idx) => {
        const thirdParty = matterDev?.thirdPartyAppSupport ?? [];
        const apple = mapThirdParty(thirdParty, 'Apple Home App');
        const google = mapThirdParty(thirdParty, 'Google Home App');
        const smart = mapThirdParty(thirdParty, 'SmartThings App');
        const alexa = mapThirdParty(thirdParty, 'Alexa App');

        const supportedClusters = normalizeList(matterDev?.supportedClusters);
        const unsupportedClusters = normalizeList(matterDev?.unsupportedClusters);

        const searchText = buildSearchText([
            device.deviceInfo.model,
            device.deviceInfo.type,
            device.deviceInfo.brand,
            device.deviceInfo.category,
            ewelinkSupported ? '支持易微联云' : '不支持易微联云',
            ...(device.ewelinkCloud?.capabilities ?? []),
            matterSupported ? '支持Matter' : '不支持Matter',
            matterDev?.deviceType,
            matterDev?.protocolVersion,
            supportedClusters.join(' '),
            unsupportedClusters.join(' '),
            apple.supported.join(' '),
            google.supported.join(' '),
            smart.supported.join(' '),
            alexa.supported.join(' '),
            haSupported ? '支持HomeAssistant' : '不支持HomeAssistant',
            ...(device.homeAssistant?.entities ?? []),
        ]);

        return {
            rowId: `${parentId}-${idx}`,
            parentId,
            isGroupHead: idx === 0,
            groupSpan: idx === 0 ? span : 0,
            deviceInfoRowSpan: 1,
            searchText,
            deviceModel: device.deviceInfo.model,
            deviceType: device.deviceInfo.type,
            deviceBrand: device.deviceInfo.brand,
            deviceCategory: device.deviceInfo.category,
            ewelinkSupported,
            ewelinkCapabilities: normalizeList(device.ewelinkCloud?.capabilities),
            matterSupported,
            matterDeviceType: matterDev?.deviceType,
            matterProtocolVersion: matterDev?.protocolVersion,
            matterSupportedClusters: supportedClusters,
            matterUnsupportedClusters: unsupportedClusters,
            appleSupported: apple.supported,
            appleNotes: apple.notes,
            googleSupported: google.supported,
            googleNotes: google.notes,
            smartThingsSupported: smart.supported,
            smartThingsNotes: smart.notes,
            alexaSupported: alexa.supported,
            alexaNotes: alexa.notes,
            homeAssistantSupported: haSupported,
            homeAssistantEntities: normalizeList(device.homeAssistant?.entities),
        };
    });
}
