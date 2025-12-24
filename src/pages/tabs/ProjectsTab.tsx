import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '@/services/dataService';
import type { Project, ProjectStage, ProjectPriority } from '@/types/bd';
import {
  BD_OPTIONS,
  PROJECT_STAGE_BADGE_CLASS,
  PROJECT_STAGE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from '@/config/bdOptions';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Calendar, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initUserProfileFromWindow, renderUserProfile } from '@/lib/feishuUserProfile';
// 飞书时间戳兜底展示
import { formatDateSafe } from '@/lib/date';

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

const ProjectsTab: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [bdFilter, setBdFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [hoursSort, setHoursSort] = useState<string>('none');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchKeyword, stageFilter, typeFilter, serviceTypeFilter, priorityFilter, bdFilter, monthFilter, hoursSort]);

  const loadProjects = async () => {
    const data = await dataService.getAllProjects();
    setProjects(data);
  };

  const filterProjects = () => {
    let result = [...projects];

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter((p) =>
        (p.projectName || '').toLowerCase().includes(keyword) ||
        (p.shortName || '').toLowerCase().includes(keyword),
      );
    }

    if (stageFilter !== 'all') {
      result = result.filter((p) => p.stage === stageFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((p) => p.projectType === typeFilter);
    }

    if (serviceTypeFilter !== 'all') {
      result = result.filter((p) => p.serviceType === serviceTypeFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((p) => p.priority === priorityFilter);
    }

    if (bdFilter !== 'all') {
      result = result.filter((p) => p.bd === bdFilter);
    }

    if (monthFilter !== 'all') {
      const extractMonth = (raw: any) => {
        if (raw === null || raw === undefined) return '';
        const str = String(raw).trim();
        if (!str) return '';
        const match = str.match(/(\d{1,2})\s*$/);
        if (match) return String(Number(match[1]));
        const parts = str.replace(/\//g, '.').replace(/-/g, '.').split('.');
        const last = parts[parts.length - 1];
        if (!last) return '';
        const n = Number(last);
        return Number.isFinite(n) ? String(n) : '';
      };
      result = result.filter((p) => Number(extractMonth(p.month)) === Number(monthFilter));
    }

    if (hoursSort !== 'none') {
      const getHours = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      result = result.sort((a, b) => {
        const diff = getHours(a.totalBdHours) - getHours(b.totalBdHours);
        return hoursSort === 'asc' ? diff : -diff;
      });
    }

    setFilteredProjects(result);
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setShowDetail(true);
  };

  const getStageBadgeClass = (stage: ProjectStage) => PROJECT_STAGE_BADGE_CLASS[stage] || '';

  const getPriorityBadgeVariant = (priority: ProjectPriority) => {
    switch (priority) {
      case 'P0':
        return 'default';
      case 'P1':
        return 'secondary';
      case 'P2':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/** 月份选项改为 1-12 */}
      {/* 筛选栏 */}
      <Card>
        <CardContent className="pt-4">
          {/** 月份使用数字 1-12 */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索项目名称或客户..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="进度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部进度</SelectItem>
                  {PROJECT_STAGE_OPTIONS.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="类别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类别</SelectItem>
                  {PROJECT_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="服务类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部服务</SelectItem>
                  {SERVICE_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  {PROJECT_PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={bdFilter} onValueChange={setBdFilter}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="BD" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部BD</SelectItem>
                  {BD_OPTIONS.map((bd) => (
                    <SelectItem key={bd} value={bd}>
                      {bd}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="月份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部月份</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((month) => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={hoursSort} onValueChange={setHoursSort}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="累计商务时间" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不排序</SelectItem>
                  <SelectItem value="asc">累计商务时间升序</SelectItem>
                  <SelectItem value="desc">累计商务时间降序</SelectItem>
                </SelectContent>
              </Select>
              <div className="hidden md:flex items-center gap-2 ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card
            key={project.projectId}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => handleProjectClick(project)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-sm line-clamp-2">
                    {project.projectName || '-'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {project.projectId}
                  </div>
                </div>
                <Badge
                  variant={getPriorityBadgeVariant(project.priority)}
                  className="text-xs shrink-0"
                >
                  {project.priority || '-'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="text-xs">
                  {project.totalBdHours ?? '-'}h
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {project.serviceType || '-'}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-xs', getStageBadgeClass(project.stage))}
                >
                  {project.stage || '-'}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>
                  BD: <UserProfileName name={project.bd || '-'} openId={project.bdOpenId} />
                  <span className="ml-2">AM: {project.am || '-'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateSafe(project.lastUpdateDate) || '-'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">暂无项目数据</div>
      )}

      {/* 详情弹窗 */}
            {/* 详情弹窗 */}
            {/* 详情弹窗 */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5" />
              {selectedProject?.projectName || '项目详情'}
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <ScrollArea className="max-h-[calc(90vh-100px)]">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">基本信息</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">项目ID：</span>
                        <span className="font-mono">{selectedProject.projectId || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">客户ID：</span>
                        <span className="font-mono">{selectedProject.customerId || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">项目名称：</span>
                        <span>{selectedProject.projectName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">客户/部门简称：</span>
                        <span>{selectedProject.shortName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">服务类型：</span>
                        <span>{selectedProject.serviceType || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">项目类别：</span>
                        <Badge variant="outline" className="ml-2">
                          {selectedProject.projectType || '-'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">项目进度：</span>
                        <Badge
                          variant="outline"
                          className={cn('ml-2', getStageBadgeClass(selectedProject.stage))}
                        >
                          {selectedProject.stage || '-'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">优先级：</span>
                        <Badge variant={getPriorityBadgeVariant(selectedProject.priority)} className="ml-2">
                          {selectedProject.priority || '-'}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">所属年月：</span>
                        <span>{selectedProject.month || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">活动名称：</span>
                        <span>{selectedProject.campaignName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">交付名称：</span>
                        <span>{selectedProject.deliverableName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">BD：</span>
                        <span>{selectedProject.bd || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">AM：</span>
                        <span>{selectedProject.am || '-'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">金额 / 时间</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">预估项目金额：</span>
                        <span>{selectedProject.expectedAmount ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">累计商务时间(hr)：</span>
                        <span>{selectedProject.totalBdHours ?? '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">最近更新日期：</span>
                        <span>{formatDateSafe(selectedProject.lastUpdateDate) || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">下次跟进日期：</span>
                        <span>{formatDateSafe(selectedProject.nextFollowDate) || '-'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>



    </div>
  );
};

export default ProjectsTab;
