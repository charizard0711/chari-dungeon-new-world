import {online} from './api';
import {boundedRequest} from './requestTiming';

export type FriendIcons = {
  characterId: string;
  selected: string | null;
  friends: Record<string, string>;
};

export async function friendIcons(action: 'list' | 'save', icon: string | null = null): Promise<FriendIcons> {
  if (!online) throw Error('オンラインは準備中です。');
  const client = online;
  const {data,error} = await boundedRequest(signal =>
    client.rpc('online_friend_icons',{action,icon}).abortSignal(signal), 5000);
  if (error) throw Error(error.message);
  return data as FriendIcons;
}
