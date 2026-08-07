import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Confirm Logout" size="sm">
    <div className="text-center space-y-4">
      <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-amber-500" />
      </div>
      <p className="text-slate-600 text-sm">Are you sure you want to log out of the Admin Panel?</p>
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
        <Button variant="danger" fullWidth onClick={onConfirm}>Logout</Button>
      </div>
    </div>
  </Modal>
);

export default LogoutConfirmModal;
