'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Heart, MessageCircle, MoreVertical, Send, Volume, VolumeX, Link, Pin, BarChart, Trash2, Ban, X, Bookmark } from 'lucide-react'
import AvatarWithFrame from './AvatarWithFrame'

interface PostCardProps {
  post: any
  onOpenComments?: (postId: string) => void
  onOpenShare?: (postId: string) => void
}

export default function PostCard({ post, onOpenComments, onOpenShare }: PostCardProps) {
  const router = useRouter()
  const [muted] = useState(true)
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [viewerProfile, setViewerProfile] = useState<any | null>(null)
  const [likeState, setLikeState] = useState<{ isLiked: boolean; count: number }>({ isLiked: false, count: 0 })
  const [commentCount, setCommentCount] = useState<number>(0)
  const [isFollowing, setIsFollowing] = useState<boolean>(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [viewerCollections, setViewerCollections] = useState<any[]>([])

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user || null
        setCurrentUser(user)

        // fetch viewer profile
        if (user) {
          try {
            const { data: vp } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
            if (vp) setViewerProfile(vp)
          } catch (e) {}

          // fetch viewer collections for save/remove actions
          try {
            const { data: cols } = await supabase.from('collections').select('*').eq('owner_id', user.id)
            if (Array.isArray(cols)) setViewerCollections(cols)
          } catch (e) {}
        }

        // fetch like count and whether current user liked
        const likeRes = await supabase.from('post_likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id)
        const likeCount = likeRes.count || 0
        let userLiked = false
        if (user) {
          const userLikeRes = await supabase.from('post_likes').select('*').eq('post_id', post.id).eq('user_id', user.id)
          userLiked = Array.isArray(userLikeRes.data) && userLikeRes.data.length > 0
        }
        setLikeState({ isLiked: userLiked, count: likeCount })

        // fetch comment count
        const commentRes = await supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id)
        setCommentCount(commentRes.count || 0)

        // fetch follow state
        if (user) {
          try {
            const { data: followData } = await supabase.from('followers').select('*').eq('user_id', post.user_id).eq('follower_user_id', user.id).maybeSingle()
            if (followData && !followData.unfollowed_at) setIsFollowing(true)
          } catch (e) {
            console.error('Error checking follow state', e)
          }
        }
      } catch (e) {
        console.error('PostCard init error', e)
      }
    }
    init()
  }, [post.id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  const toggleLocalLike = async (postId: string) => {
    try {
      if (!currentUser) return router.push('/login')
      if (post.user_id === currentUser.id) return
      if (likeState.isLiked) {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', currentUser.id)
        if (!error) setLikeState(s => ({ isLiked: false, count: Math.max(0, s.count - 1) }))
      } else {
        const { error } = await supabase.from('post_likes').insert([{ post_id: postId, user_id: currentUser.id }])
        if (!error) setLikeState(s => ({ isLiked: true, count: s.count + 1 }))
      }
    } catch (e) {
      console.error('toggle like error', e)
    }
  }

  // Menu actions
  const handleCopyLink = async (postId: string) => {
    try {
      const url = (typeof window !== 'undefined' ? window.location.origin : '') + `/post/${postId}`
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        // fallback
        const ta = document.createElement('textarea')
        ta.value = url
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      setCopiedLink(postId)
      setTimeout(() => setCopiedLink(null), 2000)
      setMenuOpen(false)
    } catch (e) {
      console.error('Error copying link', e)
    }
  }

  const togglePin = async (postId: string) => {
    if (!currentUser) return
    try {
      const { data: prof, error } = await supabase.from('profiles').select('pinned_posts').eq('id', currentUser.id).maybeSingle()
      if (error) {
        console.error('Error fetching profile for pin:', error)
        return
      }
      const currentPinned: string[] = Array.isArray(prof?.pinned_posts) ? prof.pinned_posts : []
      if (!currentPinned.includes(postId) && currentPinned.length >= 1) {
        alert('You can only pin 1 post to your profile')
        return
      }
      const newPinned = currentPinned.includes(postId) ? currentPinned.filter(id => id !== postId) : [postId, ...currentPinned.filter(id => id !== postId)]
      const { error: updErr } = await supabase.from('profiles').update({ pinned_posts: newPinned }).eq('id', currentUser.id)
      if (updErr) {
        console.error('Error toggling pin:', updErr)
      } else {
        setViewerProfile((prev: any) => prev ? { ...prev, pinned_posts: newPinned } : prev)
        window.dispatchEvent(new Event('pinnedPostsChanged'))
      }
    } catch (e) {
      console.error('Exception toggling pin:', e)
    } finally {
      setMenuOpen(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return
    if (!confirm('Delete this post?')) return
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId)
      if (error) {
        console.error('Error deleting post:', error)
      } else {
        // fire an event so parent pages can react
        window.dispatchEvent(new CustomEvent('postDeleted', { detail: { id: postId } }))
      }
    } catch (e) {
      console.error('Exception deleting post:', e)
    } finally {
      setMenuOpen(false)
    }
  }

  const handleSaveOrRemoveFromCollection = async (postId: string) => {
    if (!currentUser) return
    try {
      // find existing collection containing this post
      const savedIn = viewerCollections.find(c => Array.isArray(c.saved_posts) && c.saved_posts.includes(postId))
      if (savedIn) {
        // remove
        const newArray = (savedIn.saved_posts || []).filter((id: string) => id !== postId)
        const { data, error } = await supabase.from('collections').update({ saved_posts: newArray }).eq('collection_id', savedIn.collection_id).select()
        if (error) console.error('Error removing from collection:', error)
        else setViewerCollections(prev => prev.map(c => c.collection_id === savedIn.collection_id ? data[0] : c))
        // Notify other UI (optimistic immediate removal in collection view)
        try {
          window.dispatchEvent(new CustomEvent('collectionPostRemoved', { detail: { collectionId: savedIn.collection_id, postId } }))
        } catch (e) {}
      } else {
        // save to first collection or prompt to create
        if (viewerCollections.length === 0) {
          const name = prompt('No collections found. Enter a name to create a new collection:')
          if (!name) return
          const { data: created, error } = await supabase.from('collections').insert([{ collection_name: name, owner_id: currentUser.id, saved_posts: [postId] }]).select()
          if (error) {
            console.error('Error creating collection:', error)
          } else if (created && created[0]) {
            setViewerCollections(prev => [created[0], ...prev])
          }
        } else {
          const first = viewerCollections[0]
          const existing = Array.isArray(first.saved_posts) ? first.saved_posts : []
          if (existing.includes(postId)) return
          const { data, error } = await supabase.from('collections').update({ saved_posts: [...existing, postId] }).eq('collection_id', first.collection_id).select()
          if (error) console.error('Error saving to collection:', error)
          else setViewerCollections(prev => prev.map(c => c.collection_id === first.collection_id ? data[0] : c))
        }
      }
    } catch (e) {
      console.error('Exception saving/removing collection:', e)
    } finally {
      setMenuOpen(false)
    }
  }

  const handleBlockUser = async (userId: string) => {
    if (!currentUser) return
    if (!confirm('Block this user?')) return
    try {
      const { error } = await supabase.from('blocked_users').insert([{ blocker_id: currentUser.id, blocked_id: userId }])
      if (error) console.error('Error blocking user:', error)
      else window.dispatchEvent(new CustomEvent('userBlocked', { detail: { id: userId } }))
    } catch (e) {
      console.error('Exception blocking user:', e)
    } finally {
      setMenuOpen(false)
    }
  }

  const handleReportPost = (postId: string) => {
    alert('Reported. Thank you.')
    setMenuOpen(false)
  }

  // normalize media url field
  let mediaUrl: string | null = null
  try {
    if (!post) mediaUrl = null
    else if (Array.isArray(post.media_url)) mediaUrl = post.media_url[0] || null
    else if (post.media_url && typeof post.media_url === 'object') mediaUrl = post.media_url.publicUrl || post.media_url.url || null
    else mediaUrl = post.media_url || null
  } catch (e) {
    mediaUrl = null
  }

  const isVideo = mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || mediaUrl.includes('.mov') || mediaUrl.includes('video'))

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 snap-center">
      <div className="relative w-full max-w-2xl h-full max-h-screen flex">
        <div className="bg-[#1f1f1f] rounded-xl border border-gray-800 overflow-hidden hover:border-gray-700 transition-colors w-full cursor-pointer flex-1" onClick={(e)=>{e.stopPropagation()}}>
          <div className="p-5">
            <div className="flex items-start gap-3 mb-4 cursor-pointer relative" onClick={() => { router.push(`/profile/${post.profiles?.username}`) }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
              <AvatarWithFrame src={post.profiles?.avatar_url} alt={post.profiles?.username} equippedFrame={post.profiles?.equipped_frame} size="md" frameScale={1.25} className={`flex-shrink-0 transition-opacity ${hovered ? 'opacity-60' : 'opacity-100'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`text-white font-semibold text-sm transition-all ${hovered ? 'border-b-2 border-[#ff4234] inline-block pb-0.5' : ''}`}>{post.profiles?.display_name || post.profiles?.username}</h4>
                </div>
                <p className="text-gray-500 text-xs">@{post.profiles?.username} · {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}</p>
              </div>

              <div className="ml-2 flex items-center gap-2">
                {post.user_id !== currentUser?.id && hovered && (
                  <button onClick={(e)=>{ e.stopPropagation(); const action = isFollowing ? 'unfollow' : 'follow'; fetch('/api/toggle-follow',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:post.user_id,followerUserId:currentUser?.id,action})}).then(r=>r.json()).then(j=>{ if(j?.success) setIsFollowing(!isFollowing) }) }} className={`flex-shrink-0 px-3 py-1 rounded-lg transition-colors text-xs font-medium ${isFollowing ? 'bg-gray-700 hover:bg-red-600 text-white' : 'bg-[#ff4234] hover:bg-red-600 text-white'}`}>{isFollowing ? 'Unfollow' : 'Follow'}</button>
                )}

                {hovered && (
                  <div className="relative">
                    <button onClick={(e)=>{ e.stopPropagation(); setMenuOpen(v=>!v) }} className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors"><MoreVertical size={20} /></button>
                    {menuOpen && (
                      <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-[#252525] border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                        {/* Owner options */}
                            {post.user_id === currentUser?.id ? (
                          <>
                            <button onClick={(e)=>{ e.stopPropagation(); handleCopyLink(post.id) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                              <Link size={18} />
                              <span>{copiedLink === post.id ? 'Copied!' : 'Copy Link'}</span>
                            </button>
                            <button onClick={(e)=>{ e.stopPropagation(); togglePin(post.id) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 text-left hover:bg-[#2a2a2a]">
                              <Pin size={18} />
                              <span>{viewerProfile?.pinned_posts && viewerProfile.pinned_posts.includes(post.id) ? 'Unpin from My Profile' : 'Pin to My Profile'}</span>
                            </button>
                            <button onClick={(e)=>{ e.stopPropagation(); /* placeholder for stats */ alert('Open stats') }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                              <BarChart size={18} />
                              <span>View Stats</span>
                            </button>
                            <div className="border-t border-gray-700" />
                            <button onClick={(e)=>{ e.stopPropagation(); handleDeletePost(post.id) }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] text-left">
                              <Trash2 size={18} />
                              <span>Delete Post</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={(e)=>{ e.stopPropagation(); handleCopyLink(post.id) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                              <Link size={18} />
                              <span>{copiedLink === post.id ? 'Copied!' : 'Copy Link'}</span>
                            </button>
                            <button onClick={(e)=>{ e.stopPropagation(); handleSaveOrRemoveFromCollection(post.id) }} className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#2a2a2a] transition-colors text-left">
                              <Bookmark size={18} />
                              <span>{viewerCollections.find(c => Array.isArray(c.saved_posts) && c.saved_posts.includes(post.id)) ? 'Remove from Collection' : 'Save to Collection'}</span>
                            </button>
                            <div className="border-t border-gray-700" />
                            <button onClick={(e)=>{ e.stopPropagation(); handleBlockUser(post.user_id) }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] text-left">
                              <Ban size={18} />
                              <span>Block User</span>
                            </button>
                            <button onClick={(e)=>{ e.stopPropagation(); handleReportPost(post.id) }} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-[#2a2a2a] text-left">
                              <X size={18} />
                              <span>Report Post</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-white font-bold text-lg mb-2">{post.title}</h3>
            {post.description && (<p className="text-gray-300 text-sm mb-4 whitespace-pre-wrap">{post.description}</p>)}

            {mediaUrl && (
              <div className="relative w-full bg-[#252525] max-h-96 overflow-hidden">
                {isVideo ? (
                  <div className="relative z-0 overflow-hidden">
                    <video src={mediaUrl} loop muted playsInline className="w-full h-auto object-cover hover:opacity-80 transition-opacity relative z-0" onClick={(e)=>{ e.stopPropagation(); const v=e.currentTarget as HTMLVideoElement; try{ if(v.paused){ const p=v.play(); if(p&&typeof p.then==='function') p.catch(()=>{}) } else v.pause() }catch(err){} }} onDoubleClick={(e)=>{ e.preventDefault(); e.stopPropagation(); }} />
                    <div className="absolute bottom-3 right-3 z-50 pointer-events-auto">
                      <button onClick={(e)=>{ e.stopPropagation(); setAudioEnabled(a=>!a) }} className="bg-black/70 text-white p-2 rounded-lg flex items-center justify-center" title={audioEnabled ? 'Mute' : 'Unmute'} aria-label={audioEnabled ? 'Mute video' : 'Unmute video'}>{audioEnabled ? <Volume size={18} /> : <VolumeX size={18} />}</button>
                    </div>
                  </div>
                ) : (
                  <img src={mediaUrl} alt="Post media" className="w-full h-auto object-cover hover:opacity-80 transition-opacity" />
                )}
              </div>
            )}

            <div className="px-5 py-3 border-t border-gray-800">
              <div className="flex gap-4 text-xs text-gray-500 mb-3">
                {likeState.count > 0 && (<button className="hover:underline cursor-pointer hover:text-gray-400 transition-colors">{likeState.count} {likeState.count===1?'like':'likes'}</button>)}
                {commentCount > 0 && (<span className="hover:underline cursor-pointer" onClick={(e)=>{ e.stopPropagation(); if (onOpenComments) { onOpenComments(post.id); return } router.push(`/post/${post.id}`) }}>{commentCount} {commentCount===1?'comment':'comments'}</span>)}
              </div>

              <div className="flex gap-3">
                <button onClick={()=>toggleLocalLike(post.id)} disabled={post.user_id===currentUser?.id} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium ${post.user_id===currentUser?.id ? 'text-gray-600 bg-gray-800/50 cursor-not-allowed' : likeState.isLiked ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20' : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'}`} title={post.user_id===currentUser?.id ? 'You cannot like your own post' : ''}>
                  <Heart size={18} className={likeState.isLiked ? 'fill-current' : ''} />
                  {post.user_id===currentUser?.id ? 'Your Post' : 'Like'}
                </button>
                <button onClick={(e)=>{ e.stopPropagation(); if (onOpenComments) { onOpenComments(post.id); return } router.push(`/post/${post.id}`) }} className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium text-gray-400 hover:text-blue-500 hover:bg-blue-500/10">
                  <MessageCircle size={18} />
                  Comment
                </button>
                <button onClick={(e)=>{ e.stopPropagation(); if (onOpenShare) { onOpenShare(post.id); return } try{ navigator.share?.({ title: post.title||'', text: post.content||'', url: window.location.href + 'post/' + post.id }) }catch(e){} }} className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-colors text-sm font-medium text-gray-400 hover:text-green-500 hover:bg-green-500/10" title="Share post">
                  <Send size={18} />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
