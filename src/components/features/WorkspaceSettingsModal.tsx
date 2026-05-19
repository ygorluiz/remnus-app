'use client';
import { useEffect, useState, useTransition } from 'react';
import { X, Trash, Shield, UserPlus, Check, AlertCircle, MoreHorizontal } from 'lucide-react';
import { renameWorkspace, deleteWorkspace } from '@/lib/actions/workspace';
import {
  getWorkspaceMembers,
  inviteToWorkspace,
  removeFromWorkspace,
  updateWorkspaceMemberRole,
  transferWorkspaceOwnership,
} from '@/lib/actions/auth';

type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string; // 'admin' | 'user'
};

type WorkspaceMember = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: 'owner' | 'member' | 'viewer';
};

interface WorkspaceSettingsModalProps {
  workspaceId: string;
  workspaceName: string;
  currentUser: CurrentUser;
  onClose: () => void;
  onRenamed: (newName: string) => void;
  onDeleted: () => void;
}

export default function WorkspaceSettingsModal({
  workspaceId,
  workspaceName,
  currentUser,
  onClose,
  onRenamed,
  onDeleted,
}: WorkspaceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'members'>('general');
  
  // General Tab state
  const [newName, setNewName] = useState(workspaceName);
  const [renameError, setRenameError] = useState('');
  const [renameSuccess, setRenameSuccess] = useState('');
  const [isRenaming, startRenameTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  // Members Tab state
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'viewer'>('member');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [isInviting, startInviteTransition] = useTransition();
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  // Load members on mount or when switching to members tab
  const loadMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const list = await getWorkspaceMembers(workspaceId);
      setMembers(list as WorkspaceMember[]);
    } catch (err) {
      console.error('Failed to load workspace members:', err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [workspaceId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle workspace rename
  const handleRename = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setRenameError('Workspace name cannot be empty');
      return;
    }
    setRenameError('');
    setRenameSuccess('');

    startRenameTransition(async () => {
      const res = await renameWorkspace(workspaceId, trimmed);
      if (res && 'error' in res) {
        setRenameError(res.error || 'Failed to rename workspace');
      } else {
        setRenameSuccess('Workspace renamed successfully');
        onRenamed(trimmed);
      }
    });
  };

  // Handle workspace delete
  const handleDelete = () => {
    if (!confirm('Are you sure you want to permanently delete this workspace and all its pages/databases? This action cannot be undone.')) {
      return;
    }

    startDeleteTransition(async () => {
      const res = await deleteWorkspace(workspaceId);
      if (res && 'error' in res) {
        alert(res.error);
      } else {
        onDeleted();
        onClose();
      }
    });
  };

  // Handle member invitation
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError('Please enter an email address');
      return;
    }
    setInviteError('');
    setInviteSuccess('');

    startInviteTransition(async () => {
      const res = await inviteToWorkspace(workspaceId, email, inviteRole);
      if (res && 'error' in res) {
        setInviteError(res.error || 'Failed to invite user');
      } else {
        setInviteSuccess(`Successfully invited ${email}`);
        setInviteEmail('');
        loadMembers(); // Refresh list
      }
    });
  };

  // Handle member role change
  const handleRoleChange = async (userId: string, newRole: 'member' | 'viewer') => {
    setActionPendingId(userId);
    try {
      const res = await updateWorkspaceMemberRole(workspaceId, userId, newRole);
      if (res && 'error' in res) {
        alert(res.error);
      } else {
        loadMembers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionPendingId(null);
    }
  };

  // Handle transfer ownership
  const handleTransferOwnership = async (userId: string, userName: string | null) => {
    if (!confirm(`Are you absolutely sure you want to transfer ownership of this workspace to ${userName || 'this user'}? You will be demoted to a regular member.`)) {
      return;
    }
    setActionPendingId(userId);
    try {
      const res = await transferWorkspaceOwnership(workspaceId, userId);
      if (res && 'error' in res) {
        alert(res.error);
      } else {
        loadMembers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionPendingId(null);
    }
  };

  // Handle remove member
  const handleRemoveMember = async (userId: string, userName: string | null) => {
    if (!confirm(`Are you sure you want to remove ${userName || 'this user'} from this workspace?`)) {
      return;
    }
    setActionPendingId(userId);
    try {
      const res = await removeFromWorkspace(workspaceId, userId);
      if (res && 'error' in res) {
        alert(res.error);
      } else {
        loadMembers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionPendingId(null);
    }
  };

  // Determine current user's role in this workspace
  const myWorkspaceMembership = members.find((m) => m.id === currentUser.id);
  const isWorkspaceOwner = myWorkspaceMembership?.role === 'owner';
  const isGlobalAdmin = currentUser.role === 'admin';
  const hasPrivilegedAccess = isWorkspaceOwner || isGlobalAdmin;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-100 flex items-center justify-center p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-neutral-850 border border-neutral-800 rounded-lg shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-neutral-100">Workspace Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors rounded hover:bg-neutral-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-900/10 px-5 shrink-0">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Members
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-6 flex-1 max-h-[60vh] min-h-75">
          {activeTab === 'general' ? (
            <div className="space-y-6">
              {/* Workspace Rename Section */}
              <div className="space-y-2">
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
                  Workspace Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={isRenaming || !hasPrivilegedAccess}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md text-neutral-100 placeholder-neutral-600 px-3 py-1.5 text-sm outline-none focus:border-blue-500/60 transition-colors disabled:opacity-50"
                  />
                  {hasPrivilegedAccess && (
                    <button
                      onClick={handleRename}
                      disabled={isRenaming || newName.trim() === workspaceName}
                      className="text-xs bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md font-medium transition-colors flex items-center justify-center"
                    >
                      {isRenaming ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </div>
                {renameError && (
                  <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle size={12} /> {renameError}
                  </p>
                )}
                {renameSuccess && (
                  <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                    <Check size={12} /> {renameSuccess}
                  </p>
                )}
                {!hasPrivilegedAccess && (
                  <p className="text-[11px] text-neutral-500 italic">
                    Only the workspace owner or system admins can change settings.
                  </p>
                )}
              </div>

              {/* Danger Zone */}
              {hasPrivilegedAccess && (
                <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-lg space-y-3">
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                    Danger Zone
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Once you delete a workspace, all pages, database views, and configurations inside it will be permanently removed. This action cannot be undone.
                  </p>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-xs bg-red-400 hover:bg-red-500 text-white font-semibold py-1.5 px-3 rounded-md transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Workspace'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Member Invitation (Only for Owner/Admin) */}
              {hasPrivilegedAccess && (
                <form onSubmit={handleInvite} className="space-y-2">
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
                    Invite New Member
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      disabled={isInviting}
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-md text-neutral-100 placeholder-neutral-600 px-3 py-1.5 text-sm outline-none focus:border-blue-500/60 transition-colors disabled:opacity-50"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'member' | 'viewer')}
                      disabled={isInviting}
                      className="bg-neutral-900 border border-neutral-700 rounded-md text-neutral-100 px-2 py-1.5 text-xs outline-none cursor-pointer focus:border-blue-500/60"
                    >
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isInviting || !inviteEmail.trim()}
                      className="text-xs bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1"
                    >
                      <UserPlus size={13} />
                      {isInviting ? 'Inviting...' : 'Invite'}
                    </button>
                  </div>
                  {inviteError && (
                    <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                      <AlertCircle size={12} /> {inviteError}
                    </p>
                  )}
                  {inviteSuccess && (
                    <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                      <Check size={12} /> {inviteSuccess}
                    </p>
                  )}
                </form>
              )}

              {/* Members List */}
              <div className="space-y-3">
                <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
                  Workspace Members ({members.length})
                </label>

                {isLoadingMembers ? (
                  <div className="py-8 flex justify-center items-center">
                    <div className="w-5 h-5 rounded-full border-2 border-neutral-800 border-t-neutral-500 animate-spin" />
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/20">
                    {members.map((member) => {
                      const isMe = member.id === currentUser.id;
                      const isOwner = member.role === 'owner';
                      const isPending = actionPendingId === member.id;

                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 gap-3">
                          {/* Left: User Avatar & Details */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            {member.image ? (
                              <img
                                src={member.image}
                                alt={member.name || 'User'}
                                className="w-7 h-7 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-semibold text-neutral-200 shrink-0">
                                {(member.name || member.email || 'U')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-neutral-200 truncate">
                                  {member.name || member.email || 'User'}
                                </span>
                                {isMe && (
                                  <span className="text-[9px] font-semibold text-neutral-500 bg-neutral-800 px-1 py-0.5 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              {member.name && member.email && (
                                <p className="text-[10px] text-neutral-500 truncate">{member.email}</p>
                              )}
                            </div>
                          </div>

                          {/* Right: Role & Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Role Badge / Control */}
                            {isOwner ? (
                              <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                Owner
                              </span>
                            ) : isPending ? (
                              <div className="w-3.5 h-3.5 rounded-full border border-neutral-700 border-t-neutral-400 animate-spin shrink-0" />
                            ) : hasPrivilegedAccess && !isMe ? (
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value as 'member' | 'viewer')}
                                className="bg-neutral-800 border border-neutral-700 rounded px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300 outline-none cursor-pointer hover:border-neutral-600 focus:border-blue-500/60"
                              >
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            ) : (
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                member.role === 'viewer'
                                  ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                                  : 'text-neutral-300 bg-neutral-800 border-neutral-700'
                              }`}>
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </span>
                            )}

                            {/* Owner specific transfer and delete actions */}
                            {hasPrivilegedAccess && !isMe && !isOwner && !isPending && (
                              <div className="flex items-center gap-1.5 ml-1">
                                <button
                                  onClick={() => handleTransferOwnership(member.id, member.name || member.email)}
                                  className="text-[10px] font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-1.5 py-0.5 rounded border border-neutral-700 transition-colors"
                                  title="Transfer ownership of this workspace to this user"
                                >
                                  Make Owner
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(member.id, member.name || member.email)}
                                  className="p-1 text-neutral-500 hover:text-red-400 transition-colors rounded hover:bg-neutral-800"
                                  title="Remove member from workspace"
                                >
                                  <Trash size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
