import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../lib/utils';

interface VideoCallProps {
  channelName: string;
  role: 'host' | 'audience';
  onEnd: () => void;
}

// @ts-ignore
const APP_ID = (import.meta as any).env.VITE_AGORA_APP_ID || "e66b5e13d30b4844b6f95ad4b9cd7572";

export function VideoCall({ channelName, role, onEnd }: VideoCallProps) {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const localPlayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let agoraClient: IAgoraRTCClient;
    let localTracks: [IMicrophoneAudioTrack, ICameraVideoTrack];

    const init = async () => {
      try {
        agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setClient(agoraClient);

        agoraClient.on('user-published', async (user, mediaType) => {
          try {
            await agoraClient.subscribe(user, mediaType);
            console.log(`[Agora] Subscribed to ${user.uid} ${mediaType}`);
            
            setRemoteUsers((prev) => {
              // Ensure we create a new list and new user objects to trigger re-renders
              const others = prev.filter(u => u.uid !== user.uid);
              const updatedUser = { 
                ...user, 
                uid: user.uid, 
                videoTrack: user.videoTrack, 
                audioTrack: user.audioTrack 
              };
              return [...others, updatedUser];
            });

            if (mediaType === 'audio') {
              user.audioTrack?.play();
            }
          } catch (e) {
            console.error("Subscription error:", e);
          }
        });

        agoraClient.on('user-unpublished', (user) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
        });

        // Create a consistent numeric UID from user email to prevent ghost users
        const numericUid = user?.email 
          ? Array.from(user.email).reduce((acc, char) => acc + char.charCodeAt(0), 0) 
          : Math.floor(Math.random() * 1000000);

        await agoraClient.join(APP_ID, channelName, null, numericUid);

        // Use a more compatible video profile for mobile stability
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: '360p_1',
        }).catch((e) => {
          console.error("Camera error:", e);
          alert("আপনার ক্যামেরা ব্যবহার করা যাচ্ছে না। দয়া করে ব্রাউজার পারমিশন চেক করুন।");
          return null;
        });
        
        if (audioTrack) {
          setLocalAudioTrack(audioTrack);
          await agoraClient.publish(audioTrack);
        }
        
        if (videoTrack) {
          setLocalVideoTrack(videoTrack);
          console.log("[Agora] Publishing local video track...");
          await agoraClient.publish(videoTrack);
        }

        setIsConnected(true);
      } catch (error) {
        console.error("Agora init error:", error);
      }
    };

    const subscribeWithRetry = async (client: IAgoraRTCClient, user: any, mediaType: string, retries = 3) => {
      try {
        await client.subscribe(user, mediaType as any);
        if (mediaType === 'video') {
          setRemoteUsers((prev) => {
            const exists = prev.find(u => u.uid === user.uid);
            if (exists) return prev.map(u => u.uid === user.uid ? { ...user } : u);
            return [...prev, { ...user }];
          });
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
      } catch (e) {
        if (retries > 0) setTimeout(() => subscribeWithRetry(client, user, mediaType, retries - 1), 1000);
      }
    };

    init();

    return () => {
      localTracks?.[0]?.stop();
      localTracks?.[0]?.close();
      localTracks?.[1]?.stop();
      localTracks?.[1]?.close();
      agoraClient?.leave();
    };
  }, [channelName]);

  // Handle local video playback with better timing
  useEffect(() => {
    if (localVideoTrack && localPlayerRef.current) {
      localVideoTrack.play(localPlayerRef.current, { fit: 'cover' });
    }
    return () => localVideoTrack?.stop();
  }, [localVideoTrack]);

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleMic = async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!micOn);
      setMicOn(!micOn);
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!videoOn);
      setVideoOn(!videoOn);
    }
  };

  const toggleSpeaker = () => {
    // In Browser, speaker is managed by the OS typically, 
    // but we can adjust existing remote audio tracks
    remoteUsers.forEach(user => {
      if (user.audioTrack) {
        if (speakerOn) {
          user.audioTrack.setVolume(0);
        } else {
          user.audioTrack.setVolume(100);
        }
      }
    });
    setSpeakerOn(!speakerOn);
  };

  const handleEndCall = () => {
    localAudioTrack?.stop();
    localAudioTrack?.close();
    localVideoTrack?.stop();
    localVideoTrack?.close();
    client?.leave();
    onEnd();
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="relative w-full h-full bg-slate-950 overflow-hidden">
        {/* Remote Video (Main - Background) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {remoteUsers.length > 0 ? (
            // Only show the first remote user for 1:1 WhatsApp style
            <RemotePlayer user={remoteUsers[0]} />
          ) : (
            <div className="text-center space-y-6 z-10 px-6">
              <div className="w-20 h-20 bg-emerald-500/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto animate-pulse border border-emerald-500/20">
                <Video size={32} className="text-emerald-500" />
              </div>
              <div className="space-y-2">
                <p className="text-white text-lg font-bold">কানেক্ট হচ্ছে...</p>
                <p className="text-slate-400 text-xs px-10">আপনার অপরিপার্শ্বের জন্য অপেক্ষা করা হচ্ছে। অনুগ্রহ করে লাইন কাটবেন না।</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (PIP - Small Floating Box) */}
        <div 
          ref={localPlayerRef}
          className={cn(
            "absolute top-6 right-6 w-28 md:w-40 aspect-[9/16] bg-slate-900 rounded-[24px] overflow-hidden border-2 border-white/30 shadow-2xl z-50 transition-all",
            !videoOn && "border-red-500/50"
          )}
        >
          {!videoOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <VideoOff size={24} className="text-slate-700" />
            </div>
          )}
        </div>

        {/* Top Indicators */}
        <div className="absolute top-6 left-6 flex items-center gap-3 z-50">
          <div className="bg-black/30 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
            <span className="text-white text-[10px] font-bold uppercase tracking-wider">সরাসরি</span>
          </div>
        </div>

        {/* Action Controls (WhatsApp Style - Small & Bottom) */}
        <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-6 z-[60]">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-3xl px-4 py-3 rounded-[32px] border border-white/10 shadow-3xl">
            <button 
              onClick={toggleMic}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full transition-all",
                micOn ? "bg-white/10 text-white" : "bg-red-500/90 text-white"
              )}
            >
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            
            <button 
              onClick={toggleSpeaker}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full transition-all",
                speakerOn ? "bg-white/10 text-white" : "bg-amber-500/90 text-white"
              )}
            >
              {speakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button 
              onClick={handleEndCall}
              className="w-12 h-12 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 mx-2"
            >
              <PhoneOff size={22} fill="white" />
            </button>

            <button 
              onClick={toggleVideo}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full transition-all",
                videoOn ? "bg-white/10 text-white" : "bg-red-500/90 text-white"
              )}
            >
              {videoOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            <button 
                onClick={toggleFullScreen}
                className="w-10 h-10 flex items-center justify-center bg-white/10 text-white rounded-full transition-all"
            >
                {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemotePlayer({ user }: { user: any }) {
  const playerRef = useRef<HTMLDivElement>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let timeoutId: any;
    if (playerRef.current && user.videoTrack) {
      console.log(`[Agora] Attempting to play video for user: ${user.uid}`);
      user.videoTrack.play(playerRef.current, { fit: 'cover' });
      
      // Force a re-play in case of black screen issues
      timeoutId = setTimeout(() => {
        if (user.videoTrack) {
          user.videoTrack.stop();
          user.videoTrack.play(playerRef.current, { fit: 'cover' });
        }
      }, 2000);
    }
    
    return () => {
      clearTimeout(timeoutId);
      try {
        user.videoTrack?.stop();
      } catch (e) {}
    };
  }, [user.videoTrack, user.uid, retry]);

  return (
    <div className="w-full h-full relative">
      <div ref={playerRef} className="w-full h-full" />
      {/* Invisible button to trigger manual re-play */}
      <button 
        onClick={() => setRetry(prev => prev + 1)}
        className="absolute bottom-24 right-4 bg-white/20 hover:bg-white/30 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur-sm z-[200]"
      >
        ভিডিও আসছে না? এখানে চাপুন
      </button>
    </div>
  );
}
