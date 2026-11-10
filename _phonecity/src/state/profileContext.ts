import { createContext, useContext } from 'react';
import type { Profile } from '../data/profile';

/** 3D 캔버스 안까지 전달되는 프로필 (R3F가 컨텍스트를 이어준다) */
export const ProfileContext = createContext<Profile>({ nickname: '', look: 'boy' });
export const useProfile = () => useContext(ProfileContext);
