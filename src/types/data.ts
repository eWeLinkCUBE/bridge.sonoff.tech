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

/**
 * 前端渲染使用的表格数据
 * 可能是真实设备，也可能真实设备 matter-bridge 同步的设备，一个真实设备可对应多个 matter-bridge 设备
 */
export interface FlatRow {
    rowId: string;
    parentId: string;
    isGroupHead: boolean;
    deviceInfoGroupId: string;
    deviceInfoGroupSize: number;
    deviceInfoGroupIndex: number;

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

/** 表格中勾选好的筛选内容 */
export type EnumFilters = Partial<{
    deviceModel: string[];
    deviceType: string[];
    brand: string[];
    category: string[];
    ewelinkSupported: boolean[];
    ewelinkCapabilities: string[];
    matterSupported: boolean[];
    matterDeviceType: string[];
    matterProtocolVersion: string[];
    matterSupportedClusters: string[];
    appleSupported: string[];
    googleSupported: string[];
    smartThingsSupported: string[];
    alexaSupported: string[];
    homeAssistantSupported: boolean[];
    homeAssistantEntities: string[];
}>;

/** 每个筛选内容的内容以及数量 */
export interface EnumOption {
    value: string;
    count: number;
}

/** 每一列的筛选具体可筛选内容 */
export type EnumOptionMap = {
    deviceModel: EnumOption[];
    deviceType: EnumOption[];
    brand: EnumOption[];
    category: EnumOption[];
    ewelinkSupported: EnumOption[];
    ewelinkCapabilities: EnumOption[];
    matterSupported: EnumOption[];
    matterDeviceType: EnumOption[];
    matterProtocolVersion: EnumOption[];
    matterSupportedClusters: EnumOption[];
    appleSupported: EnumOption[];
    googleSupported: EnumOption[];
    smartThingsSupported: EnumOption[];
    alexaSupported: EnumOption[];
    homeAssistantSupported: EnumOption[];
    homeAssistantEntities: EnumOption[];
};

/** 排序规则 */
export interface SortSpec {
    /** 列索引 */
    id: keyof FlatRow;
    /** 为 true 按照降序排，false 或者不传按照升序排 */
    desc?: boolean;
}

/** 搜索数据 */
export interface QueryInput {
    /** 输入字符串进行搜索 */
    q?: string;
    /** 每一列对应的筛选内容 */
    enums?: EnumFilters;
    /** 每一列的排序逻辑，按照传入键顺序进行优先级排序 */
    sort?: SortSpec[];
    /** 页码 */
    page?: number;
    /** 每页数据量 */
    pageSize?: number;
}
