import statsResetImg from '../assets/images/shop_stats_reset_1794540237348.jpg';
import documentsImg from '../assets/images/shop_documents_1794540238437.jpg';
import protectiveMaskImg from '../assets/images/shop_protective_mask_1794540237412.jpg';
import rifleImg from '../assets/images/shop_rifle_1794540238691.jpg';
import whiteKillerShieldImg from '../assets/images/shop_white_killer_shield_1794540238792.jpg';
import votingProtectionImg from '../assets/images/shop_voting_protection_1794540238634.jpg';
import rolePassImg from '../assets/images/shop_role_pass_1794540239081.jpg';
import { FunctionalItemCategory } from './types';

export const SHOP_ARTWORK_BY_KEY: Record<string, string> = {
  stats_reset: statsResetImg,
  documents: documentsImg,
  protective_mask: protectiveMaskImg,
  rifle: rifleImg,
  white_killer_shield: whiteKillerShieldImg,
  voting_protection: votingProtectionImg,
  role_pass: rolePassImg,
};

export const SHOP_ARTWORK_BY_CATEGORY: Record<FunctionalItemCategory, string> = {
  STATISTICS_RESET: statsResetImg,
  DOCUMENTS: documentsImg,
  PROTECTIVE_MASK: protectiveMaskImg,
  RIFLE: rifleImg,
  WHITE_KILLER_PROTECTION: whiteKillerShieldImg,
  VOTING_PROTECTION: votingProtectionImg,
  ROLE_PURCHASE: rolePassImg,
};

export function resolveShopImageSrc(imageUrl?: string, category?: string): string | null {
  if (imageUrl) {
    if (SHOP_ARTWORK_BY_KEY[imageUrl]) return SHOP_ARTWORK_BY_KEY[imageUrl];
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:') || imageUrl.startsWith('/')) {
      return imageUrl;
    }
  }
  if (category && category in SHOP_ARTWORK_BY_CATEGORY) {
    return SHOP_ARTWORK_BY_CATEGORY[category as FunctionalItemCategory];
  }
  return null;
}
