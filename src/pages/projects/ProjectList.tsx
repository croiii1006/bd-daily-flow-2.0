import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectDB } from '@/data/projects';
import { signoffDB } from '@/data/signoff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Edit, FileCheck, FolderKanban } from 'lucide-react';
import { LEGACY_PROJECT_LIST_COLUMNS } from '@/types/bd';
import { cn } from '@/lib/utils';
import { initUserProfileFromWindow, renderUserProfile } from '@/lib/feishuUserProfile';

type UserProfileNameProps = {
  name: string;
  openId?: string;
  className?: string;
};

const UserProfileName: React.FC<UserProfileNameProps> = ({ name, openId, className }) => {
  const [open, setOpen] = useState(false);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<{ unmount?: () => void } | null>(null);

  useEffect(() => {
    if (!open || !openId || !mountRef.current) return;
    const ready = initUserProfileFromWindow();
    if (!ready) return;
    instanceRef.current = renderUserProfile(openId, mountRef.current);
    return () => {
      instanceRef.current?.unmount?.();
      instanceRef.current = null;
    };
  }, [open, openId]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      instanceRef.current?.unmount?.();
      instanceRef.current = null;
    } else if (!initUserProfileFromWindow()) {
      return;
    }
    setOpen(nextOpen);
  };

  if (!openId) {
    return <span className={className}>{name || '-'}</span>;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn('text-primary underline underline-offset-2', className)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {name || '-'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-2">
        <div ref={mountRef} />
      </PopoverContent>
    </Popover>
  );
};

const ProjectList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const projects = useMemo(() => {
    if (!searchTerm) return projectDB.getAll();
    return projectDB.search(searchTerm);
  }, [searchTerm]);

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case '签单':
        return 'default';
      case '跟进中':
        return 'secondary';
      case '意向沟通':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case '高':
        return 'destructive';
      case '中':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">项目库</h1>
          <p className="mt-1 text-muted-foreground">管理所有项目进度</p>
        </div>
        <Button onClick={() => navigate('/projects/new')}>
          <Plus className="mr-2 h-4 w-4" />
          新增项目
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索项目名称、客户..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {LEGACY_PROJECT_LIST_COLUMNS.map((c) => (
                    <TableHead key={c.key} className={c.headClassName}>
                      {c.title}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FolderKanban className="h-8 w-8" />
                        <p>暂无项目数据</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/projects/new')}
                        >
                          添加第一个项目
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map(project => {
                    const hasSignoff = signoffDB.hasSignoff(project.id);
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {project.projectName}
                        </TableCell>
                        <TableCell>{project.shortName}</TableCell>
                        <TableCell>
                          <Badge variant={getCategoryBadgeVariant(project.projectCategory)}>
                            {project.projectCategory}
                          </Badge>
                        </TableCell>
                        <TableCell>{project.projectStatus}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(project.priority)}>
                            {project.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatAmount(project.estimatedAmount)}</TableCell>
                        <TableCell>
                          <UserProfileName name={project.bd || '-'} openId={project.bdOpenId} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/projects/${project.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {project.projectCategory === '签单' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/signoff/${project.id}`)}
                                title={hasSignoff ? '编辑立项信息' : '添加立项信息'}
                              >
                                <FileCheck className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 text-sm text-muted-foreground">
        共 {projects.length} 条记录
      </div>
    </div>
  );
};

export default ProjectList;
