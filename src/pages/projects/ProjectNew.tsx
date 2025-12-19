import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerDB } from '@/data/customers';
import { projectDB } from '@/data/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MONTHS,
  SERVICE_TYPES,
  PROJECT_CATEGORIES,
  PROJECT_STATUS,
  PRIORITIES,
  BD_LIST,
  AM_LIST,
} from '@/data/options';

const ProjectNew: React.FC = () => {
  const navigate = useNavigate();
  
  const [customerId, setCustomerId] = useState('');
  const [shortName, setshortName] = useState('');
  const [month, setMonth] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [activityName, setActivityName] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [projectCategory, setProjectCategory] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [bd, setBd] = useState('');
  const [am, setAm] = useState('');

  const customers = customerDB.getAll();
  const customerOptions = customers.map(c => `${c.companyName} (${c.shortName})`);

  const generatedProjectName = useMemo(() => {
    if (month && shortName && activityName && deliveryName) {
      return `${month}-${shortName}-${activityName}-${deliveryName}`;
    }
    return '';
  }, [month, shortName, activityName, deliveryName]);

  const handleCustomerChange = (value: string) => {
    const match = value.match(/\(([^)]+)\)$/);
    if (match) {
      const shortName = match[1];
      const customer = customers.find(c => c.shortName === shortName);
      if (customer) {
        setCustomerId(customer.id);
        setshortName(customer.shortName);
      }
    }
  };

  const handleSubmit = () => {
    if (!customerId) {
      toast.error('请选择客户');
      return;
    }
    if (!month) {
      toast.error('请选择所属月份');
      return;
    }
    if (!serviceType) {
      toast.error('请选择服务类型');
      return;
    }
    if (!activityName.trim()) {
      toast.error('请输入活动名称');
      return;
    }
    if (!deliveryName.trim()) {
      toast.error('请输入交付名称');
      return;
    }
    if (!projectCategory) {
      toast.error('请选择项目类别');
      return;
    }
    if (!projectStatus) {
      toast.error('请选择项目进度');
      return;
    }
    if (!priority) {
      toast.error('请选择优先级');
      return;
    }
    if (!bd) {
      toast.error('请选择 BD');
      return;
    }
    if (!am) {
      toast.error('请选择 AM');
      return;
    }

    const newProject = projectDB.create({
      customerId,
      shortName,
      month,
      serviceType,
      activityName,
      deliveryName,
      projectCategory,
      projectStatus,
      priority,
      estimatedAmount: parseFloat(estimatedAmount) || 0,
      bd,
      am,
    });

    toast.success('项目创建成功');
    
    // 如果是签单项目，提示录入立项信息
    if (projectCategory === '签单') {
      toast.info('这是签单项目，请继续填写立项信息', {
        action: {
          label: '立即填写',
          onClick: () => navigate(`/signoff/${newProject.id}`),
        },
      });
    }
    
    navigate('/projects');
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/projects')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回项目列表
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">新增项目</h1>
        <p className="mt-1 text-muted-foreground">填写项目详细信息</p>
      </div>

      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>项目信息</CardTitle>
          <CardDescription>请完整填写以下信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 选择客户 */}
          <div className="space-y-2">
            <Label>选择客户 *</Label>
            <SearchableSelect
              options={customerOptions}
              value={customerId ? `${customers.find(c => c.id === customerId)?.companyName} (${shortName})` : ''}
              onChange={handleCustomerChange}
              placeholder="搜索并选择客户"
              searchPlaceholder="输入客户名称..."
              emptyText="未找到客户"
            />
            {customers.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  暂无客户数据，请先
                  <Button
                    variant="link"
                    className="h-auto p-0 px-1"
                    onClick={() => navigate('/customers/new')}
                  >
                    添加客户
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* 基本信息 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>所属月份 *</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>服务类型 *</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="activityName">活动名称 *</Label>
              <Input
                id="activityName"
                placeholder="如：双11预热"
                value={activityName}
                onChange={e => setActivityName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryName">交付名称 *</Label>
              <Input
                id="deliveryName"
                placeholder="如：直播带货"
                value={deliveryName}
                onChange={e => setDeliveryName(e.target.value)}
              />
            </div>
          </div>

          {/* 自动生成的项目名称 */}
          {generatedProjectName && (
            <div className="rounded-lg bg-muted p-4">
              <Label className="text-muted-foreground">自动生成项目名称</Label>
              <p className="mt-1 font-medium text-foreground">{generatedProjectName}</p>
            </div>
          )}

          {/* 项目状态 */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>项目类别 *</Label>
              <Select value={projectCategory} onValueChange={setProjectCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>项目进度 *</Label>
              <Select value={projectStatus} onValueChange={setProjectStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>优先级 *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 金额和负责人 */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="estimatedAmount">预估总金额（元）</Label>
              <Input
                id="estimatedAmount"
                type="number"
                placeholder="0"
                value={estimatedAmount}
                onChange={e => setEstimatedAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>BD *</Label>
              <Select value={bd} onValueChange={setBd}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {BD_LIST.map(b => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>AM *</Label>
              <Select value={am} onValueChange={setAm}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {AM_LIST.map(a => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => navigate('/projects')}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              <Check className="mr-2 h-4 w-4" />
              保存项目
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectNew;
