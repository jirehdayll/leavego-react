import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAccountsSync, saveAccounts } from '../lib/accountStore';
import { USER_ROLES, POSITIONS } from '../constants';
import AdminLayout from '../components/AdminLayout';
import {
  UserPlus, Search, Shield, User,
  Mail, Briefcase, Loader2, Power, XCircle,
  AlertCircle, Pencil, KeyRound, CheckCircle2, Trash2, Eye, EyeOff, Settings, Plus, Building, UserCog
} from 'lucide-react';
import { getAllDepartments, getAllPositions } from '../utils/departmentsPositions';