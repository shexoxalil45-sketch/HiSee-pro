import React, { memo } from 'react';
import { Message, Chat, User as UserType } from '../types';
import { ChatMessageItem, ChatMessageItemProps } from '../src/components/chat/ChatMessageItem';
import { getTranslation } from '../translations';

export { ChatMessageItem };
export type { ChatMessageItemProps };

export interface ChatMessageListProps {
    filteredMessages: Message[];
    myId: string;
    allUsers: UserType[];
    myProfile: any;
    displayUser: any;
    isSelectionMode: boolean;
    selectedIds: Set<string>;
    searchCategory: string | null;
    reactionPickerMsgId: string | null;
    activeAudioId: string | null;
    isAudioPlaying: boolean;
    audioProgress: number;
    currentAudioTime: string;
    audioSpeeds: Record<string, number>;
    openAudioMenuId: string | null;
    uploadProgress: Record<string, number>;
    chatSettings: any;
    firestoreChatId: string;
    chat: Chat;
    messages: Message[];
    msgStatuses: Record<string, string>;
    myMessageCount: number;
    friendStatus: 'friends' | 'pending' | 'none';
    showLimitMessage: boolean;
    lang?: string;
    isTranslatorActive?: boolean;
    translatorMode?: 'auto' | 'manual';
    targetLanguage?: string;
    sourceLanguage?: string;
    autoTranslatorActivatedAt?: number | null;
    cachedTranslations?: Record<string, string>;
    cachedVoiceData?: Record<string, { transcript: string; translated: string }>;
    onSaveTranslation?: (msgId: string, text: string) => void;
    onSaveVoiceData?: (audioId: string, data: { transcript: string; translated: string }) => void;
    handleOpenMessage: (msg: Message) => void;
    handleDeleteMessage: (msg: Message) => void;
    handleToggleSelection: (id: string) => void;
    setProfileUserId: (id: string) => void;
    setShowProfileInfo: (show: boolean) => void;
    handleTouchStart: (msg: Message) => void;
    handleTouchEnd: () => void;
    setIsSelectionMode: (mode: boolean) => void;
    setReactionPickerMsgId: (id: string | null) => void;
    handleReaction: (msgId: string, emoji: string) => void;
    handleStopLiveLocation: () => void;
    onSelectChat: (chat: Chat) => void;
    toggleAudioPlay: (msgId: string, audioUrl: string) => void;
    setOpenAudioMenuId: (id: string | null) => void;
    handleToggleAudioSpeed: (msgId: string) => void;
    handleToggleAudioLock: (msg: Message) => void;
    handleSetAudioColor: (msg: Message, color: any) => void;
    decryptText: (text: string) => string;
    decryptMessage: (msg: any) => string;
    handleMessageAction: (msg: Message, action: string) => void;
}

export const ChatMessageList = memo(({
    filteredMessages,
    myId,
    allUsers,
    myProfile,
    displayUser,
    isSelectionMode,
    selectedIds,
    searchCategory,
    reactionPickerMsgId,
    activeAudioId,
    isAudioPlaying,
    audioProgress,
    currentAudioTime,
    audioSpeeds,
    openAudioMenuId,
    uploadProgress,
    chatSettings,
    firestoreChatId,
    chat,
    messages,
    msgStatuses,
    myMessageCount,
    friendStatus,
    showLimitMessage,
    isTranslatorActive = false,
    translatorMode = 'manual',
    targetLanguage = 'ar',
    sourceLanguage = 'auto',
    autoTranslatorActivatedAt = null,
    cachedTranslations,
    cachedVoiceData,
    onSaveTranslation,
    onSaveVoiceData,
    handleOpenMessage,
    handleDeleteMessage,
    handleToggleSelection,
    setProfileUserId,
    setShowProfileInfo,
    handleTouchStart,
    handleTouchEnd,
    setIsSelectionMode,
    setReactionPickerMsgId,
    handleReaction,
    handleStopLiveLocation,
    onSelectChat,
    toggleAudioPlay,
    setOpenAudioMenuId,
    handleToggleAudioSpeed,
    handleToggleAudioLock,
    handleSetAudioColor,
    decryptText,
    decryptMessage,
    handleMessageAction,
    lang = 'ar'
}: ChatMessageListProps) => {
    return (
        <div className="flex flex-col w-full space-y-4">
            {showLimitMessage && (
                <div className="flex justify-center my-4">
                    <span className="text-[10px] bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full font-bold border border-orange-500/20 shadow-sm text-center">
                        {getTranslation(lang, 'systemQuotaReached', 'System: You have reached your quota. Waiting for reply and friendship acceptance.')}
                    </span>
                </div>
            )}
            {friendStatus !== 'friends' && myMessageCount < 2 && !chat.isGroup && (
                <div className="flex justify-center my-4">
                    <span className="text-[10px] bg-amber-500/10 text-amber-500 px-4 py-2 rounded-full font-bold border border-amber-500/20 shadow-sm">
                        {getTranslation(lang, 'systemTwoMessagesAllowed', 'System: Only 2 messages (text or audio) allowed before friendship')}
                    </span>
                </div>
            )}
            {filteredMessages.map((msg) => (
                <ChatMessageItem
                    key={msg.id}
                    msg={msg}
                    myId={myId}
                    allUsers={allUsers}
                    myProfile={myProfile}
                    displayUser={displayUser}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(msg.id)}
                    searchCategory={searchCategory}
                    reactionPickerMsgId={reactionPickerMsgId}
                    activeAudioId={activeAudioId}
                    isAudioPlaying={isAudioPlaying}
                    audioProgress={audioProgress}
                    currentAudioTime={currentAudioTime}
                    audioSpeeds={audioSpeeds}
                    openAudioMenuId={openAudioMenuId}
                    uploadProgress={Math.max(uploadProgress[msg.id] || 0, msg.uploadProgress || 0)}
                    chatSettings={chatSettings}
                    firestoreChatId={firestoreChatId}
                    chat={chat}
                    messages={messages}
                    msgStatus={msgStatuses[msg.id]}
                    isTranslatorActive={isTranslatorActive}
                    translatorMode={translatorMode}
                    targetLanguage={targetLanguage}
                    sourceLanguage={sourceLanguage}
                    autoTranslatorActivatedAt={autoTranslatorActivatedAt}
                    cachedTranslation={cachedTranslations?.[msg.id]}
                    cachedVoiceData={cachedVoiceData?.[msg.id]}
                    onSaveTranslation={onSaveTranslation}
                    onSaveVoiceData={onSaveVoiceData}
                    handleOpenMessage={handleOpenMessage}
                    handleDeleteMessage={handleDeleteMessage}
                    handleToggleSelection={handleToggleSelection}
                    setProfileUserId={setProfileUserId}
                    setShowProfileInfo={setShowProfileInfo}
                    handleTouchStart={handleTouchStart}
                    handleTouchEnd={handleTouchEnd}
                    setIsSelectionMode={setIsSelectionMode}
                    setReactionPickerMsgId={setReactionPickerMsgId}
                    handleReaction={handleReaction}
                    handleStopLiveLocation={handleStopLiveLocation}
                    onSelectChat={onSelectChat}
                    toggleAudioPlay={toggleAudioPlay}
                    setOpenAudioMenuId={setOpenAudioMenuId}
                    handleToggleAudioSpeed={handleToggleAudioSpeed}
                    handleToggleAudioLock={handleToggleAudioLock}
                    handleSetAudioColor={handleSetAudioColor}
                    decryptText={decryptText}
                    decryptMessage={decryptMessage}
                    handleMessageAction={handleMessageAction}
                />
            ))}
        </div>
    );
});

ChatMessageList.displayName = 'ChatMessageList';
