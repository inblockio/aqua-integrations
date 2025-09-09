export interface ScrapedData {
    title: string;
    headings: string[];
    links: Array<{ text: string; href: string }>;
    paragraphs: string[];
    images: Array<{ src: string; alt: string }>;
    tradeNameDetails?: TradeNameDetails;
}

export interface TradeNameDetails {
    county: string;
    status: string;
    trade_name: string;
    file_number: string;
    formation_date: string;
    filed_date: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    zip_code: string;
    phone: string;
    affiant: string;
    affiant_title: string;
    parent_company: string;
    nature_of_business: string;
    termination_date: string;
    last_updated_on: string;
}
