export interface DeviceInfo {
    model: string;
    type: string;
    brand: string;
    category: string;
}

export interface EwelinkCloud {
    isSupported: boolean;
    capabilities?: string[];
}

export interface ThirdPartyAppSupport {
    appName: string;
    supportedClusters?: string[];
    notes?: string[];
}

export interface MatterDevice {
    deviceType: string;
    protocolVersion?: string;
    supportedClusters?: string[];
    unsupportedClusters?: string[];
    thirdPartyAppSupport?: ThirdPartyAppSupport[];
}

export interface MatterBridge {
    isSupported: boolean;
    devices?: MatterDevice[];
}

export interface HomeAssistant {
    isSupported: boolean;
    entities?: string[];
}

export interface RawDevice {
    deviceInfo: DeviceInfo;
    ewelinkCloud?: EwelinkCloud;
    matterBridge?: MatterBridge;
    homeAssistant?: HomeAssistant;
}

export type RawData = RawDevice[];

export interface FlatRow {
    rowId: string;
    parentId: string;
    isGroupHead: boolean;
    groupSpan: number;
    deviceInfoRowSpan: number;
    searchText: string;

    deviceModel: string;
    deviceType: string;
    deviceBrand: string;
    deviceCategory: string;

    ewelinkSupported: boolean;
    ewelinkCapabilities: string[];

    matterSupported: boolean;
    matterDeviceType?: string;
    matterProtocolVersion?: string;
    matterSupportedClusters: string[];
    matterUnsupportedClusters: string[];
    appleSupported: string[];
    appleNotes: string[];
    googleSupported: string[];
    googleNotes: string[];
    smartThingsSupported: string[];
    smartThingsNotes: string[];
    alexaSupported: string[];
    alexaNotes: string[];

    homeAssistantSupported: boolean;
    homeAssistantEntities: string[];
}
