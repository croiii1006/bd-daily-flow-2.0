import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerDB } from '@/data/customers';
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
import { ArrowLeft, Save } from 'lucide-react';
import {
  CUSTOMER_TYPES,
  CUSTOMER_LEVELS,
  ANNUAL_CONTRACT_OPTIONS,
  INDUSTRIES,
  BD_LIST,
} from '@/data/options';
import type { Customer } from '@/types';

const CustomerEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [shortName, setShortName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [customerLevel, setCustomerLevel] = useState('');
  const [annualContract, setAnnualContract] = useState('');
  const [industry, setIndustry] = useState('');
  const [headquarterCity, setHeadquarterCity] = useState('');
  const [mainBD, setMainBD] = useState('');

  useEffect(() => {
    if (id) {
      const found = customerDB.getById(id);
      if (found) {
        setCustomer(found);
        setCompanyName(found.companyName);
        setShortName(found.shortName);
        setDepartmentName(found.departmentName);
        setCustomerType(found.customerType);
        setCustomerLevel(found.customerLevel);
        setAnnualContract(found.annualContract);
        setIndustry(found.industry);
        setHeadquarterCity(found.headquarterCity);
        setMainBD(found.mainBD);
      } else {
        toast.error('客户不存在');
        navigate('/customers');
      }
    }
  }, [id, navigate]);

  const handleSubmit = () => {
    if (!id) return;

    if (!companyName.trim()) {
      toast.error('请输入企业名称');
      return;
    }
    if (!shortName.trim()) {
      toast.error('请输入客户简称');
      return;
    }

    const updated = customerDB.update(id, {
      companyName,
      shortName,
      departmentName,
      customerType,
      customerLevel,
      annualContract,
      industry,
      headquarterCity,
      mainBD,
    });

    if (updated) {
      toast.success('客户信息已更新');
      navigate('/customers');
    } else {
      toast.error('更新失败');
    }
  };

  if (!customer) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/customers')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回客户列表
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">编辑客户</h1>
        <p className="mt-1 text-muted-foreground">修改客户「{customer.companyName}」的信息</p>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>客户信息</CardTitle>
          <CardDescription>修改后点击保存按钮更新信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">企业名称 *</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">客户简称 *</Label>
              <Input
                id="shortName"
                value={shortName}
                onChange={e => setShortName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="departmentName">客户部门名称</Label>
            <Input
              id="departmentName"
              value={departmentName}
              onChange={e => setDepartmentName(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>客户类型</Label>
              <Select value={customerType} onValueChange={setCustomerType}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>客户等级</Label>
              <Select value={customerLevel} onValueChange={setCustomerLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>年框客户</Label>
              <Select value={annualContract} onValueChange={setAnnualContract}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {ANNUAL_CONTRACT_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>所属行业</Label>
              <SearchableSelect
                options={INDUSTRIES}
                value={industry}
                onChange={setIndustry}
                placeholder="请选择行业"
                searchPlaceholder="搜索行业..."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="headquarterCity">总部城市</Label>
              <Input
                id="headquarterCity"
                value={headquarterCity}
                onChange={e => setHeadquarterCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>主 BD 负责人</Label>
              <Select value={mainBD} onValueChange={setMainBD}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {BD_LIST.map(bd => (
                    <SelectItem key={bd} value={bd}>
                      {bd}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => navigate('/customers')}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="mr-2 h-4 w-4" />
              保存更改
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerEdit;
